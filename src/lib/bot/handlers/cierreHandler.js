import fs from "fs";
import path from "path";
import { enviarMensajeWhatsApp, guardarMensajeChat } from "../services/messageService";
import { generarReportePDF } from "../../pdf-generator";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "evidencias-montaje";

export async function handleCierreFlow(ctx, res) {
  const { supabase, personal, phoneClean, jid, audio, geminiKey } = ctx;
  const sesion = ctx.sesion;
  const resultado = ctx.resultadoIA;
  const tipoSeguimiento = ctx.tipoSeguimiento || "estandar";
  const reporteActual = ctx.reporteActual;

  const horometroFinal = resultado.horometro_final;
  const kmFinal = resultado.km_final;

  const esVehiculo = tipoSeguimiento === 'vehiculo';
  const lecturaFinal = esVehiculo ? kmFinal : horometroFinal;
  const lecturaInicio = esVehiculo ? (reporteActual?.km_inicial || 0) : (reporteActual?.horometro_inicio || 0);
  const nombreLectura = esVehiculo ? 'odómetro (kilometraje) final' : 'horómetro final';
  const unidadLectura = esVehiculo ? 'km' : 'hrs';

  // 1. Validar que la lectura final no sea nula ni indefinida
  if (lecturaFinal === null || lecturaFinal === undefined) {
    await supabase
      .from("sesiones_whatsapp")
      .update({ estado_espera: "ESPERANDO_CHECKOUT_AUDIO", updated_at: new Date().toISOString() })
      .eq("id", sesion.id);

    const ejemploCierre = esVehiculo
      ? `_"Cierre, kilometraje final 84.500, sin carga de combustible"_`
      : `_"Cierre, horómetro final 11.005, sin combustible"_`;

    const msgError = `⚠️ *Lectura final obligatoria*\n\nHola ${personal.nombre_completo}, para cerrar tu jornada es **estrictamente necesario** que nos indiques el **${nombreLectura}** del equipo.\n\nPor favor, envíalo por audio o texto.\n\n_Ejemplo: ${ejemploCierre}_`;

    await guardarMensajeChat(supabase, phoneClean, "model", msgError, "texto", sesion.reporte_activo_id);
    await enviarMensajeWhatsApp(jid, phoneClean, msgError, !!audio, geminiKey);
    return res.status(200).json({ success: true, action: "LECTURA_FINAL_REQUERIDA" });
  }

  // 2. Validar que la lectura final no sea menor a la inicial
  if (lecturaFinal < lecturaInicio) {
    await supabase
      .from("sesiones_whatsapp")
      .update({ estado_espera: "ESPERANDO_CHECKOUT_AUDIO", updated_at: new Date().toISOString() })
      .eq("id", sesion.id);

    const msgError = `⚠️ *Lectura final inválida*\n\nEl **${nombreLectura}** indicado (*${lecturaFinal.toLocaleString("es-CL")} ${unidadLectura}*) es menor que el valor de inicio (*${lecturaInicio.toLocaleString("es-CL")} ${unidadLectura}*).\n\nPor favor, verifica el tablero e indica el valor correcto por audio o texto.`;

    await guardarMensajeChat(supabase, phoneClean, "model", msgError, "texto", sesion.reporte_activo_id);
    await enviarMensajeWhatsApp(jid, phoneClean, msgError, !!audio, geminiKey);
    return res.status(200).json({ success: true, action: "LECTURA_FINAL_INVALIDA" });
  }

  const esFalla = resultado.es_falla_critica || resultado.tipo_evento === "Detenido por Falla";
  const estadoFinalCierre = esFalla ? "Detenido por Falla" : "Disponible";

  // Actualizar reporte con datos de cierre
  const updateData = { estado_final: esFalla ? "Detenido por Falla" : "Disponible" };
  if (horometroFinal) updateData.horometro_final = horometroFinal;
  if (kmFinal) updateData.km_final = kmFinal;
  if (resultado.petroleo_litros) updateData.petroleo_litros = resultado.petroleo_litros;
  if (resultado.horometro_carga_combustible)
    updateData.horometro_carga_combustible = resultado.horometro_carga_combustible;
  if (resultado.combustible_nivel_porcentaje !== null && resultado.combustible_nivel_porcentaje !== undefined) {
    updateData.combustible_final_porcentaje = resultado.combustible_nivel_porcentaje;
    updateData.combustible_nivel_porcentaje = resultado.combustible_nivel_porcentaje;
  }

  await supabase
    .from("reportes_diarios")
    .update(updateData)
    .eq("id", sesion.reporte_activo_id);

  const eqUpdate = { estado_actual: estadoFinalCierre };
  if (horometroFinal) eqUpdate.ultimo_horometro = horometroFinal;
  if (kmFinal) eqUpdate.ultimo_odometro = kmFinal;
  if (resultado.combustible_nivel_porcentaje !== null && resultado.combustible_nivel_porcentaje !== undefined) {
    eqUpdate.combustible_nivel_porcentaje = resultado.combustible_nivel_porcentaje;
  }
  await supabase.from("equipos").update(eqUpdate).eq("id", reporteActual.equipo_id);

  // Evento de cierre
  await supabase.from("eventos_jornada").insert({
    reporte_id: sesion.reporte_activo_id,
    estado_hito: estadoFinalCierre,
    hora_evento: new Date().toISOString(),
    nota_transcripcion: `CHECK-OUT: ${resultado.detalles_texto || "Cierre de jornada"}${kmFinal ? ` | Odómetro: ${kmFinal}` : ""}${horometroFinal ? ` | Horómetro: ${horometroFinal}` : ""}`,
  });

  await enviarMensajeWhatsApp(jid, phoneClean,
    `⏳ *Consolidando tu reporte diario...*\nGenerando PDF con todos los hitos del día.`,
    !!audio,
    geminiKey
  );

  // Responder de inmediato al webhook para evitar timeouts
  res.status(200).json({ success: true, action: "CHECKOUT_PROCESANDO" });

  // Procesar la compilación del PDF en segundo plano (asíncronamente)
  (async () => {
    try {
      const { data: reporteCompleto } = await supabase
        .from("reportes_diarios")
        .select("*")
        .eq("id", sesion.reporte_activo_id)
        .single();

      const { data: equipo } = await supabase
        .from("equipos")
        .select("*")
        .eq("id", reporteCompleto.equipo_id)
        .single();

      const supervisor = reporteCompleto.supervisor_id
        ? (await supabase.from("personal").select("nombre_completo").eq("id", reporteCompleto.supervisor_id).maybeSingle()).data
        : null;

      const { data: eventosRaw } = await supabase
        .from("eventos_jornada")
        .select("*, especialidades(nombre_oficial)")
        .eq("reporte_id", sesion.reporte_activo_id)
        .order("hora_evento", { ascending: true });

      const eventos = (eventosRaw || []).map(e => ({
        ...e,
        especialidad_nombre: e.especialidades?.nombre_oficial,
      }));

      const { data: evidencias } = await supabase
        .from("evidencias")
        .select("*")
        .eq("reporte_id", sesion.reporte_activo_id);

      const pdfUrl = await generarReportePDF({
        reporte: reporteCompleto,
        equipo,
        operador: personal,
        supervisor,
        eventos,
        evidencias: evidencias || [],
      });

      // Subir PDF a Supabase Storage para persistencia ante despliegues
      try {
        const localFilePath = path.join(process.cwd(), "public", pdfUrl);
        if (fs.existsSync(localFilePath)) {
          const fileBuffer = fs.readFileSync(localFilePath);
          const fechaPdf = new Date(reporteCompleto.fecha);
          const anioPdf = fechaPdf.getFullYear();
          const mesPdf = String(fechaPdf.getMonth() + 1).padStart(2, "0");
          const storagePath = `reportes/${anioPdf}/${mesPdf}/${reporteCompleto.id}.pdf`;

          console.log(`[cierreHandler] 📄 Subiendo PDF a Supabase Storage: ${storagePath}...`);
          const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(storagePath, fileBuffer, {
              contentType: "application/pdf",
              upsert: true
            });

          if (uploadErr) {
            console.error("[cierreHandler] Error subiendo PDF a Storage:", uploadErr.message);
          } else {
            console.log(`[cierreHandler] 📄 PDF respaldado exitosamente en Supabase Storage: ${storagePath}`);
          }
        }
      } catch (storageErr) {
        console.error("[cierreHandler] Error en respaldo de PDF a Supabase Storage:", storageErr.message);
      }

      // Guardar URL del PDF
      await supabase
        .from("reportes_diarios")
        .update({ pdf_url: pdfUrl })
        .eq("id", sesion.reporte_activo_id);

      // Cerrar sesión
      await supabase
        .from("sesiones_whatsapp")
        .delete()
        .eq("id", sesion.id);

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://equipos.lukeapp.me";
      if (equipo?.tipo_seguimiento === 'vehiculo') {
        const kmFinalCalculado = kmFinal || reporteCompleto.km_final;
        const kmRecorridos = kmFinalCalculado && reporteCompleto.km_inicial ? (kmFinalCalculado - reporteCompleto.km_inicial) : null;
        await enviarMensajeWhatsApp(jid, phoneClean,
          `✅ *Reporte Diario de Jornada consolidado con éxito.*\n\n🚗 Odómetro: ${reporteCompleto.km_inicial?.toLocaleString("es-CL") || "—"} → ${kmFinalCalculado?.toLocaleString("es-CL") || "—"} km\n${kmRecorridos !== null ? `⏱ Kilómetros recorridos: ${kmRecorridos.toLocaleString("es-CL")} km\n` : ""}\n📄 Descarga tu reporte aquí:\n👉 ${baseUrl}${pdfUrl}\n\n¡Buen término de jornada, ${personal.nombre_completo}! 👷‍♂️`,
          !!audio,
          geminiKey
        );
      } else {
        await enviarMensajeWhatsApp(jid, phoneClean,
          `✅ *Reporte Diario de Jornada consolidado con éxito.*\n\n📊 Horómetro: ${reporteCompleto.horometro_inicio} → ${horometroFinal || "—"} hrs\n${horometroFinal ? `⏱ Horas trabajadas: ${(horometroFinal - reporteCompleto.horometro_inicio).toFixed(1)} hrs\n` : ""}\n📄 Descarga tu reporte aquí:\n👉 ${baseUrl}${pdfUrl}\n\n¡Buen término de jornada, ${personal.nombre_completo}! 👷‍♂️`,
          !!audio,
          geminiKey
        );
      }
    } catch (pdfErr) {
      console.error("[cierreHandler] Error generando PDF en segundo plano:", pdfErr.message);
      await supabase.from("sesiones_whatsapp").delete().eq("id", sesion.id);
      await enviarMensajeWhatsApp(jid, phoneClean,
        `✅ Jornada cerrada correctamente. Hubo un problema generando el PDF, pero tus datos están guardados. Contacta a tu supervisor.`,
        !!audio,
        geminiKey
      );
    }
  })().catch(err => {
    console.error("[cierreHandler] Error crítico en ejecución asíncrona de PDF:", err.message);
  });
}
