# Perfumerías · revisión del 17 de octubre de 2026

LIBERTA PERFUME sustituye a Atelier ann el 5 de enero de 2027 para dos personas. Es perfume corporal EDP de 50 ml por persona, desde ¥17.000 cada uno (¥34.000 los dos), más extras opcionales. Se desean las 11:00; se contempla una hora de consulta y 30–60 minutos de preparación. Reserva y pago pendientes.

Se consultó el [calendario enlazado por LIBERTA](https://select-type.com/rsv/?c_id=307118&id=Sm2YMCAHYUc&pv_flg=1), eligiendo Standard y navegando hasta enero de 2027. El día 5 aparece como texto sin enlace seleccionable y no muestra horarios. No se pudo confirmar disponibilidad a las 11:00 ni durante la mañana. Esto no demuestra que esté agotado: la fecha aún no ofrece cupos publicados. Noviembre mostraba días seleccionables; diciembre y enero no. No se ha verificado una regla oficial de liberación. Se eliminó la antigua regla de 14 días de Atelier ann.

El formulario admite hasta dos personas en una reserva. La [página oficial Full Order](https://liberta-perfume.com/pages/fullorder/) y el formulario confirman precio y formato. Dirección: 1-14-4 Aobadai, Meguro-ku, Tokyo. Primero se visita Nakameguro y después se conserva el orden del resto del día; los trayectos antiguos que tocaban Atelier se recalculan. No se inventan coordenadas, tarifas ni tiempos de transporte.

## Sugerencias opcionales

Las 17 ubicaciones tienen dirección, enlace oficial y acceso a Maps en sus tarjetas. Ninguna queda seleccionada automáticamente. La ubicación verificada no garantiza stock ni apertura en Año Nuevo.

| Días compatibles | Opciones | Fuentes oficiales |
|---|---|---|
| 28 dic · Minami | U NOSE SHOP Shinsaibashi PARCO B1F; @cosme TSUTAYA EBISUBASHI 3F; THE FLAVOR DESIGN Minamihorie | [NOSE SHOP](https://noseshop.jp/pages/shop), [@cosme](https://www.cosme.net/store/blog/260907/3596/), [FLAVOR](https://www.theflavordesign.com/store/) |
| 29 dic · Umeda | NOSE SHOP Osaka LUCUA 1100 4F; @cosme OSAKA 3F | [NOSE SHOP](https://noseshop.jp/pages/shop), [@cosme](https://www.cosme.net/store/shop/osaka/) |
| 5 ene · Shibuya/Harajuku/Aoyama | THE FLAVOR DESIGN Tokyo; @cosme TOKYO; DI SER en amritara house Omotesando; Le Labo Aoyama; SHOLAYERED Harakado | [FLAVOR](https://www.theflavordesign.com/store/tokyo/), [@cosme](https://www.cosme.net/store/flagship/tokyo/), [DI SER](https://www.diser-parfum.com/en/index.html), [Le Labo](https://www.lelabofragrances.jp/locations), [SHOLAYERED](https://sholayered.jp/pages/stores) |
| 6 ene · Shinjuku | NOSE SHOP NEWoMan 2F; ĖDIT(h) Kagurazaka, con desvío explícito | [NOSE SHOP](https://noseshop.jp/pages/shop), [ĖDIT(h)](https://edithtokyo.com/en/stores_en/) |
| 3 o 6 ene · Asakusa | FUKUSHI, con cita y apertura por confirmar | [FUKUSHI](https://www.fukushijp.com/en/access) |
| 2 u 8 ene · Ginza | J-Scent y çanoma en Ginza Tsutaya Books GINZA SIX 6F; KITOWA en Ginza Mitsukoshi | [J-Scent](https://luzfragrance.pro/j-scent/storelist), [çanoma](https://canoma-parfum.com/pages/stores), [KITOWA](https://www.kitowa.co.jp/pages/shop-list) |
| 2 u 8 ene · Roppongi | Parfum Satori, reapertura de Año Nuevo por confirmar; el 8 requiere desvío desde Ginza | [Satori](https://parfum-satori.com/?mode=f12) |

@cosme Ebisubashi anuncia cierre el **11 de enero de 2027 a las 22:00**, después de la visita. Flavor Shake de THE FLAVOR DESIGN es fabric mist para textiles. Le Labo Aoyama evita depender de la sucursal de Daikanyama cuya ficha advierte cierre temporal. J-Scent y çanoma en Ginza corresponden al mismo local: pueden combinarse en una visita.

## Persistencia y validación

No se modificaron `initialTrip.json`, `recoveryTrip.json`, sus fragmentos, las reglas de Firestore ni credenciales. La migración se ejecuta en `finalizeProtectedState`, después de que la sincronización escoge la revisión vigente y restaura sus decisiones. Conserva compras, comprobantes, selecciones y la fecha del registro de decisiones. El marcador `perfume-plan-2026-10-17-v1` evita volver a imponerla sobre ediciones posteriores. El guardado conserva la transacción con control de revisión y la lectura de verificación existentes.

El código se aplica al estado en vivo al abrir la versión actualizada con una sesión autorizada. Esta tarea no realizó una escritura directa a Firestore desde una copia seed. Las pruebas de interfaz se hicieron en una vista local con Firebase simulado, sin cambios de autenticación en producción.

`validatePerfumePlan.mjs`, incluido en `test:runtime`, comprueba costos para dos, reserva pendiente, rutas, sugerencias por día, estado del 7 de enero sin cambios, compras/notas recientes, idempotencia y persistencia de selecciones. También pasan las pruebas existentes de sincronización y la compilación. En la UI se añadió SHOLAYERED y se comprobó su permanencia al recargar; esa selección fue únicamente de prueba local.
