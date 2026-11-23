import type { Reservation } from "../types";

const REVIEWS: Record<string, { title: string; detail: string; url: string; action: string }> = {
  "v7-5-perfume": {
    title: "LIBERTA · ya permite continuar",
    detail: "23 nov: Standard del 5 ene a las 11:00 permite seleccionar 2 personas y llegar al formulario. También aparecieron 12:30, 14:00, 15:30, 17:00 y 18:30. Desde ¥34.000 para dos, más ingredientes opcionales. Falta enviar y recibir confirmación; el cupo no está retenido.",
    url: "https://select-type.com/rsv/?c_id=307118&id=Sm2YMCAHYUc&pv_flg=1", action: "Reservar LIBERTA",
  },
  "v7-3-kintsugi": {
    title: "Kintsugi · Klook",
    detail: "Plan: 6 ene, 10:00, dos personas. Producto 186225 publicado; precio observado desde US$17,35 por persona. Falta verificar fecha, horario y total: el navegador interno encontró un control de acceso de Klook al intentar comprobar inventario. Publicación no equivale a cupo confirmado.",
    url: "https://www.klook.com/en-US/activity/186225-tokyo-kintsugi-making-experience/", action: "Ver Kintsugi en Klook",
  },
  "v7-6-ring": {
    title: "Anillo de moneda · Klook Shinjuku",
    detail: "Plan: 6 ene, 15:00, dos personas. Producto 222801 publicado, desde ¥3.500 por persona según el buscador de Klook. Falta validar cupo y precio final del 6 ene; el calendario no pudo comprobarse por el control de acceso. Elegir Shinjuku para conservar la ruta.",
    url: "https://www.klook.com/en-US/activity/222801-tokyo-vintage-coin-ring-making-workshop-in-shinjuku/", action: "Ver anillos en Klook",
  },
  "d7-spa": {
    title: "Kuu Omotesando · falta confirmar la pareja",
    detail: "Solicitud del 1 nov para 7 ene, 15:30: Premium 120 min + Head Soak + Scalp Carbonated Spray para cada uno. Referencia ¥37.000 por persona / ¥74.000 ambos, pendiente confirmación final. El correo de prlg26 sigue sin respuesta encontrada al 23 nov. El 23 nov llegó un acuse automático por WhatsApp, sin confirmar disponibilidad. Seguir por el chat oficial +81 90 8771 5505 y pedir simultaneidad, duración y enlace oficial de pago. La web exige contacto previo para parejas y no ofrece reembolso tras confirmar. No hacer dos reservas individuales sin respuesta.",
    url: "https://reservia.jp/reserve/menu/9cf4c43158?is_guest=1&start_page=2", action: "Ver contacto y condiciones del spa",
  },
  "jan8-suggestion-zp-pillow": {
    title: "Nishikawa · consulta pendiente",
    detail: "Visita prevista el 8 ene. El calendario consultado el 23 nov no ofreció días reservables en enero; no hay cupo verificable. Un turno por persona. La propia tienda recomienda consultar por teléfono aunque la web no muestre disponibilidad; también publica un formulario de contacto. El precio de la almohada se paga aparte de gestionar la cita.",
    url: "https://reserva.be/nemurimo4/contact?mode=edit", action: "Consultar a Nishikawa",
  },
  "v7-8-brother": {
    title: "Brother JOYFACTORY · Klook oficial localizado",
    detail: "Plan: 8 ene, 16:00, dos personas. La web oficial enlaza el producto Klook 231519; también GetYourGuide y Viator. Entrada + Samurai ¥8.800 por persona; Karaoke Record es un extra contratado dentro. Referencia del plan con karaoke: ¥27.500 ambos. Falta verificar cupos del 8 ene. Tras comprar hay que completar el enlace del correo de Brother para obtener su QR.",
    url: "https://www.klook.com/activity/231519-brother-joyfactory-tokyo-entry-ticket-samurai-experience-tokyo/", action: "Ver Brother en Klook",
  },
  "v7-30-kaiyukan": {
    title: "Kaiyukan · siguiente control 30 nov",
    detail: "Plan: 30 dic, 11:00, dos adultos. Sigue pendiente de compra según el registro. Próximo control previsto: 30 nov, según la ventana de 30 días anotada en el planeador. Falta comprobar precio y hora en la taquilla; Klook también publica el producto 598.",
    url: "https://www.kaiyukan.com/info/ticket/kaiyukan/", action: "Abrir taquilla Kaiyukan",
  },
  "jan8-suggestion-zp-art-aquarium-ginza": {
    title: "Art Aquarium · sin fecha verificable",
    detail: "Plan: 2 ene. El calendario oficial mostró enero, pero el 2 no ofreció una selección de entrada verificable en esta revisión. No se interpreta como agotado. Mantener el control del 1 dic como fecha estimada y volver a comprobar precio y horario.",
    url: "https://ticket.artaquarium.jp/en/application/ticket/?ec=22051210223854&rc=001", action: "Abrir Art Aquarium",
  },
};

export function BookingReview({ reservations }: { reservations: Reservation[] }) {
  const rows = Object.entries(REVIEWS).flatMap(([id, review]) => {
    const reservation = reservations.find(row => row.activityId === id);
    return reservation ? [{ id, review, reservation }] : [];
  });
  return <section className="bookingReview" aria-label="Revisión de pendientes del 23 de noviembre">
    <h3>Pendientes revisados · 23 nov 2026</h3>
    <p>Se ocultan al registrarlos como reservados o pagados. Los horarios y precios son observaciones de esta revisión y pueden cambiar.</p>
    {rows.map(({ id, review, reservation }) => <details key={id}>
      <summary>{review.title} <small>· {reservation.travelDate}</small></summary>
      <p>{review.detail}</p>
      <a className="chipButton" href={review.url} target="_blank" rel="noreferrer">{review.action}</a>
    </details>)}
    {!rows.length ? <p>No quedan pendientes de esta revisión en las actividades seleccionadas.</p> : null}
    <details><summary>Mensaje listo para consultar al spa</summary><p lang="en">Hello Kuu Omotesando team, I am following up on my email sent on November 1. Could you confirm availability for my wife and me on January 7, 2027 at 15:30, with simultaneous treatments? We requested the Men's and Lady's Premium 120-minute Head Spa with Neck &amp; Shoulder Massage, each with Head Soak and Scalp Carbonated Spray. Please confirm the total price (listed estimate ¥74,000 for two), total visit duration and official payment process. Nearby afternoon times would also work. Thank you, Pedro Lievano.</p><small>Borrador; no enviado.</small></details>
    <p><strong>Transporte:</strong> revisar también los trenes del 25 dic: control previsto 24 nov a las 20:00 de Bogotá para la apertura de un mes. N’EX de regreso del 9 ene: 8 dic, 20:00 Bogotá. Comprobar primero si ya están comprados.</p>
  </section>;
}

