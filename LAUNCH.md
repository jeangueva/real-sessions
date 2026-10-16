# Checklist de lanzamiento

Lo que hay que configurar y comprobar para que Mockio funcione con usuarios
reales. Todo se configura en **Render → servicio `real-sessions` →
Environment**; los detalles técnicos están en [DEPLOY.md](DEPLOY.md).

Después de cada cambio de variables, Render vuelve a desplegar. En **Logs**,
la línea de arranque dice qué quedó activo:

```
Mockio API on http://localhost:10000 (sessions: redis, progress: postgres,
rate limits: redis, email: resend, voice: deepgram, web: served)
```

Si ahí dice `email: console` o `voice: browser`, falta la variable
correspondiente.

---

## 1. Imprescindible

Sin esto, el producto no funciona o no cobra.

- [ ] **`OPENROUTER_API_KEY`** — el jurado, el entrevistador y los
  informes.
  - Dónde: [openrouter.ai](https://openrouter.ai) → Keys. Carga saldo:
    cada ensayo consume crédito.
  - Comprobar: un ensayo responde con la primera pregunta del jurado.
- [ ] **`REALSESSIONS_SITE_URL`** — tu dominio, con `https://` y sin `/`
  al final (por ejemplo `https://getmockio.com`).
  - De aquí salen los enlaces de los correos, los informes compartidos y
    las invitaciones a la sustentación grupal.
  - Comprobar: el arranque deja de avisar sobre `localhost`.
- [ ] **`RESEND_API_KEY`** y **`EMAIL_FROM`** — los correos de cuenta.
  - Dónde: [resend.com](https://resend.com) → Domains: agrega tu dominio y
    copia los registros DNS hasta que diga *Verified*. Luego API Keys.
  - `EMAIL_FROM` debe ser de ese dominio, por ejemplo
    `Mockio <hola@getmockio.com>`.
  - Comprobar: al crear una cuenta llega el correo de verificación (revisa
    también spam).
- [ ] **`REALSESSIONS_LIFECYCLE_EMAIL=1`** — los correos programados: la
  cuenta regresiva a la fecha de sustentación, el calentamiento del día D y
  el recordatorio por inactividad.
  - Viene en `render.yaml`. Si ya creaste el servicio, agrégala a mano en
    Environment: sin ella esos correos nunca salen.
  - Ponla solo en `real-sessions`, nunca en tu `.env` local: tu laptop
    apunta a la misma base y le escribiría a clientes reales.
  - Comprobar: con una fecha de sustentación guardada, a las 07:00 (hora de
    Lima) llega el correo de la cuenta regresiva.
- [ ] **Mercado Pago** — los cobros en Perú.
  - Dónde: [Mercado Pago Developers](https://www.mercadopago.com.pe/developers)
    → Tus integraciones → tu aplicación → **Credenciales de producción**.
  - `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY`.
  - `MERCADOPAGO_MODE=live`. Con `test` no se cobra de verdad, y sin valor
    el checkout no abre.
  - Webhooks → URL `https://TU-DOMINIO/api/billing/webhook`, eventos de
    pagos y suscripciones. Copia la clave secreta en
    `MERCADOPAGO_WEBHOOK_SECRET`.
  - Comprobar: compra el pack más barato con tu tarjeta (ver la prueba de
    humo, abajo).
- [ ] **`DEEPGRAM_API_KEY`** — la voz natural del jurado y la
  transcripción en vivo.
  - Dónde: [console.deepgram.com](https://console.deepgram.com) → API Keys.
  - Sin ella se usa la voz del navegador: suena robótica y en Firefox no
    hay reconocimiento de voz.
  - Comprobar: el arranque dice `voice: deepgram`.
- [ ] **Razón social en los Términos** — en
  `web/src/legal/content.ts`, `OPERATOR.entity` todavía dice "Mockio".
  Debe ser el nombre legal (empresa o persona natural), idealmente con
  RUC.

## 2. Recomendable

Cada una se apaga sola si falta, sin romper nada.

- [ ] **Paddle** — cobrar fuera de Perú en la moneda de cada país, con
  Paddle como vendedor registrado. Sin esto, todos pagan con Mercado Pago
  en soles.
  - Variables: `PADDLE_ENV` (`sandbox` o `production`), `PADDLE_API_KEY`,
    `PADDLE_CLIENT_TOKEN`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_MONTHLY`,
    `PADDLE_PRICE_YEARLY`.
  - Webhook: `https://TU-DOMINIO/api/billing/paddle/webhook`.
  - Pasos completos en `.env.example`.
- [ ] **`GOOGLE_CLIENT_ID`** — el botón "Continuar con Google".
  - Dónde: Google Cloud Console → APIs y servicios → Credenciales → ID de
    cliente OAuth (aplicación web).
  - En *Orígenes de JavaScript autorizados* va tu dominio.
- [ ] **`AZURE_SPEECH_KEY`** y **`AZURE_SPEECH_REGION`** — el acento de
  cada país en el jurado: un jurado peruano que suena peruano.
- [ ] **`GOOGLE_TTS_API_KEY`** — las voces en portugués de Brasil.
- [ ] **`B2B_INBOX`** — el correo donde llegan las solicitudes de
  universidades (si no, llegan a hello@getmockio.com).
- [ ] **`LTI_PRIVATE_KEY`** — obligatorio **antes** de conectar cualquier
  universidad; ver "Connecting a university" en DEPLOY.md.
- [ ] **Panel de administración** (`mockio-admin`): `ADMIN_EMAILS` (quién
  puede entrar), `ADMIN_DATABASE_URL`, `ADMIN_REDIS_URL` y las mismas
  `RESEND_API_KEY` / `EMAIL_FROM`.
- [ ] **`AFFILIATE_MIN_PAYOUT`** — el mínimo para pagar a afiliados
  (S/ 50 si no se pone). Debe ser el mismo valor en los dos servicios.
- [ ] **TURN** (`CALL_TURN_URL`, `CALL_TURN_USERNAME`,
  `CALL_TURN_CREDENTIAL`) — solo si en la prueba grupal las cámaras no se
  conectan. Servicios con plan gratuito: Metered, Twilio, Cloudflare.

## 3. Prueba de humo (unos 30 minutos)

Hazla en producción, con tu dominio, antes de anunciar.

- [ ] **Cuenta**: crea una con un correo real, confirma desde el correo y
  pide "olvidé mi contraseña" para ver que también llega.
- [ ] **Ensayo gratis**: sube una tesis en PDF, espera el diagnóstico y haz
  el ensayo express hasta ver el acta con la nota.
- [ ] **Compra**: compra el pack más barato con tu tarjeta.
  - Debe activarse solo: aparecen los ensayos del pack.
  - Luego pide el reembolso a Mercado Pago (o desde su panel) dentro de
    los 7 días.
- [ ] **Sustentación grupal**: con un compañero, cada uno en su
  dispositivo.
  - Desde Chrome en el celular del compañero: invita, entra, se ven y se
    escuchan.
  - Él responde una pregunta y, al terminar, ve su parte del informe.
- [ ] **Celular**: repite el ensayo gratis desde un celular, para revisar
  que todo cabe en pantalla.
- [ ] **Legal**: abre `/terms` y `/privacy` y revisa que no quede ningún
  aviso de borrador.

## 4. Fuera del código

- [ ] Que un abogado peruano revise los Términos y la Privacidad. Temas:
  - Código de Protección y Defensa del Consumidor (INDECOPI).
  - Ley de Protección de Datos Personales (Ley 29733).
  - Inscripción de bancos de datos personales ante la autoridad.
- [ ] El correo `hello@getmockio.com` existe y alguien lo lee: es el de
  reembolsos y consultas que citan los Términos.
- [ ] Libro de reclamaciones virtual, exigido en Perú para vender en línea.
