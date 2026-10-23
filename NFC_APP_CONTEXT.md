# Blackbeer NFC Writer App — Contexto para Agente

## 1. Proyecto Padre: Blackbeer Sistema de Puntos

### ¿Qué es Blackbeer?
Bar/hamburguesería que usa un sistema de loyalty points donde los clientes acumulan puntos ($1 = 1 punto) y los canjean por productos (tragos, comida).

### Stack del backend (ya construido)
- **Framework**: Next.js 14 App Router (Turbopack)
- **DB**: Prisma 5 + SQLite (archivo `dev.db`)
- **Auth**: NextAuth v5 beta (credentials, JWT)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Deploy local**: `http://localhost:3000`

### Modelos de datos relevantes (Prisma schema)

```prisma
model Customer {
  id         String  @id @default(cuid())
  name       String
  email      String? @unique
  phone      String?
  points     Int     @default(0)
  cards      Card[]
  transactions Transaction[]
}

model Card {
  id         String   @id @default(cuid())
  barcode    String   @unique   // código impreso en la tarjeta física
  nfcUid     String?  @unique   // UID del chip NFC (se escribe con esta app)
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())
}
```

### API endpoints existentes en el backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/tarjetas/lookup?barcode=XXX` | Busca tarjeta por barcode o nfcUid |
| `GET` | `/api/tarjetas/lookup?nfcUid=XXX` | Busca tarjeta por UID NFC |
| `POST` | `/api/tarjetas` | Crea nueva tarjeta (genera barcode automático) |
| `POST` | `/api/puntos` | Agrega puntos a un cliente |
| `POST` | `/api/canjear` | Canjea producto por puntos |
| `GET` | `/api/productos` | Lista productos/premios activos |

---

## 2. App NFC Writer — Descripción General

### ¿Para qué sirve?
Aplicación **separada** (React Native / Expo) usada **solo por el staff autorizado** para:
1. Leer el UID de una tarjeta NFC virgen
2. Vincular ese UID a una tarjeta ya registrada en el sistema Blackbeer
3. Escribir datos mínimos en el chip NFC (opcional, ver §6)
4. Controlar qué dispositivos tienen permiso de hacer esto

### Usuarios
- **Staff operador**: escanea y vincula tarjetas físicas a clientes
- **Admin**: gestiona qué dispositivos tienen permiso

### Restricciones de diseño (decididas por el cliente)
- Software-only (sin hardware extra)
- App **separada** del sistema web principal
- Compatible con Android **e iOS**
- Un dispositivo PADRE puede autorizar/revocar dispositivos HIJO
- Solo dispositivos autorizados pueden vincular tarjetas

---

## 3. Modelo de Autorización de Dispositivos

### Estados de un dispositivo

```
PENDING   → recién instaló la app, espera autorización
CHILD     → autorizado por el PARENT, puede vincular tarjetas
PARENT    → super-autorizado, puede gestionar otros dispositivos
REVOKED   → dado de baja, no puede operar
```

### Flujo de autorización

```
[Nuevo dispositivo instala la app]
         ↓
   Estado: PENDING
   Muestra: código de dispositivo (UUID generado localmente)
         ↓
[Admin/PARENT aprueba en la app o en el web panel]
         ↓
   Estado: CHILD
   Puede: leer NFC + vincular tarjetas
         ↓
[Admin puede promover a PARENT o revocar]
```

### Solo UN dispositivo PARENT por instalación (recomendado)
El primer dispositivo que se registra puede auto-asignarse como PARENT (bootstrapping). Los siguientes deben ser aprobados.

---

## 4. Extensiones de API requeridas en el backend Blackbeer

Agregar estos endpoints al proyecto Next.js existente:

### 4.1 Registrar dispositivo

```
POST /api/nfc/devices
Body: { deviceId: string, deviceName: string, platform: "ios" | "android" }
Response: { id, status: "PENDING" | "PARENT" }
```

Lógica:
- Si no existe ningún dispositivo → el primero se crea como `PARENT`
- Si ya existe alguno → se crea como `PENDING`

### 4.2 Listar dispositivos (solo PARENT)

```
GET /api/nfc/devices
Headers: Authorization: Bearer <jwt>
Response: [{ id, deviceId, deviceName, platform, status, createdAt }]
```

### 4.3 Actualizar estado de dispositivo (solo PARENT)

```
PATCH /api/nfc/devices/:id
Headers: Authorization: Bearer <jwt>
Body: { status: "CHILD" | "REVOKED" | "PARENT" }
```

### 4.4 Verificar autorización del dispositivo

```
GET /api/nfc/devices/me?deviceId=<uuid>
Response: { authorized: boolean, status: string, role: "PARENT" | "CHILD" }
```

### 4.5 Vincular UID NFC a tarjeta existente

```
PATCH /api/tarjetas/:id/nfc
Headers: Authorization: Bearer <device-token>
Body: { nfcUid: string, deviceId: string }
Response: { success: true, card: { id, barcode, nfcUid } }
```

Validaciones:
- El `deviceId` debe estar en estado `CHILD` o `PARENT`
- El `nfcUid` no debe estar ya asignado a otra tarjeta
- La tarjeta debe existir y no tener UID previo (o confirmar sobreescritura)

### 4.6 Schema Prisma — nuevo modelo

```prisma
model NfcDevice {
  id          String   @id @default(cuid())
  deviceId    String   @unique   // UUID generado en el dispositivo
  deviceName  String              // ej: "Samsung Galaxy S23 de Juan"
  platform    String              // "ios" | "android"
  status      String   @default("PENDING")  // PENDING | CHILD | PARENT | REVOKED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## 5. Tech Stack de la App NFC

### Framework
**Expo (SDK 52+)** con React Native

```bash
npx create-expo-app blackbeer-nfc --template blank-typescript
```

### Dependencias clave

| Paquete | Propósito |
|---------|-----------|
| `expo-nfc-manager` (o `react-native-nfc-manager`) | Leer/escribir NFC tags |
| `expo-secure-store` | Guardar deviceId y token de forma segura |
| `expo-barcode-scanner` | Escanear barcode de la tarjeta (fallback) |
| `expo-camera` | Cámara para escanear QR/barcode |
| `expo-device` | Info del dispositivo (nombre, plataforma) |
| `react-navigation` v6 | Navegación entre pantallas |
| `@tanstack/react-query` | Fetching y cache de datos del servidor |
| `nativewind` v4 | Estilos Tailwind en React Native |
| `axios` o `ky` | HTTP client para la API |

### NFC: soporte por plataforma

| Característica | Android | iOS |
|---------------|---------|-----|
| Leer UID NFC | ✅ | ✅ (iPhone 7+, iOS 14+) |
| Escribir en tag | ✅ | ⚠️ Solo NDEF (iPhone XS+, iOS 13+) |
| Background reading | ✅ | ❌ |
| Core NFC framework | N/A | Requiere entitlement en App Store |

**Importante**: En iOS, para escribir en tags NFC se necesita:
1. La capability `com.apple.developer.nfc.readersession.formats` en el entitlement
2. `NFCReaderUsageDescription` en el `Info.plist`
3. Usar `NFCNDEFReaderSession` (solo escribe NDEF, no sectores raw)

Para esta app, el UID del chip se **lee** solamente (read-only del UID), lo que está soportado en ambas plataformas. No es necesario escribir datos en el chip para el flujo de Blackbeer.

---

## 6. Flujo Técnico de Vinculación de Tarjeta

```
[Staff abre la app]
        ↓
[App verifica deviceId guardado → GET /api/nfc/devices/me]
        ↓ authorized: true
[Pantalla principal: "Acercar tarjeta NFC"]
        ↓
[NFC Manager lee UID del chip (ej: "04:A3:B2:C1:D0:E9:F1")]
        ↓
[App muestra UID leído + campo para ingresar barcode de la tarjeta]
(alternativa: escanear barcode con cámara)
        ↓
[GET /api/tarjetas/lookup?barcode=XXX → obtiene la tarjeta]
        ↓
[Pantalla de confirmación: "¿Vincular este UID a la tarjeta de [Cliente]?"]
        ↓ confirmar
[PATCH /api/tarjetas/:id/nfc → { nfcUid }]
        ↓
[Éxito: mostrar feedback visual, listo para la siguiente tarjeta]
```

---

## 7. Pantallas de la App

### 7.1 Splash / Auth
- Logo Blackbeer (Anton font, amarillo #F6D525 sobre fondo oscuro #1E1E1E)
- Si no hay `deviceId` guardado: registrar dispositivo automáticamente
- Si hay `deviceId`: verificar estado

### 7.2 Pendiente de autorización
```
┌─────────────────────────────────┐
│         BLACKBEER               │
│      Sistema de Puntos          │
│                                 │
│  Tu dispositivo está pendiente  │
│  de autorización.               │
│                                 │
│  Código de dispositivo:         │
│  ┌─────────────────────────┐   │
│  │  BB-A3F2-9C1D-7E45      │   │
│  └─────────────────────────┘   │
│                                 │
│  Mostrá este código al admin    │
│  para que autorice tu equipo.   │
│                                 │
│  [Verificar estado]             │
└─────────────────────────────────┘
```

### 7.3 Home — Vincular tarjeta
```
┌─────────────────────────────────┐
│  ← Blackbeer NFC               │
│                                 │
│  Acercá una tarjeta NFC         │
│                                 │
│  ┌─────────────────────────┐   │
│  │   📡 (animación wave)   │   │  ← NFC scan area
│  │    Esperando tarjeta... │   │
│  └─────────────────────────┘   │
│                                 │
│  — o ingresá el barcode —       │
│                                 │
│  ┌─────────────────────────┐   │
│  │  BB-XXXXXXXX            │   │  ← input manual
│  └─────────────────────────┘   │
│  [📷 Escanear código]           │
│                                 │
│  [Buscar tarjeta →]             │
└─────────────────────────────────┘
```

### 7.4 Confirmación de vinculación
```
┌─────────────────────────────────┐
│  Tarjeta encontrada             │
│                                 │
│  Cliente: María González        │
│  Tarjeta: BB-00A1B2C3          │
│  Puntos actuales: 450           │
│                                 │
│  UID NFC leído:                 │
│  04:A3:B2:C1:D0:E9:F1          │
│                                 │
│  ⚠️  Esta tarjeta no tiene UID  │
│     NFC asignado todavía.       │
│                                 │
│  [Cancelar]  [Vincular ✓]      │
└─────────────────────────────────┘
```

### 7.5 Panel de gestión (solo PARENT)
```
┌─────────────────────────────────┐
│  Dispositivos autorizados       │
│                                 │
│  ● Samsung S23 — Juan    CHILD  │
│    [Promover] [Revocar]         │
│                                 │
│  ○ iPhone 15 — Ana     PENDING  │
│    [Autorizar] [Rechazar]       │
│                                 │
│  ● Pixel 8 — Carlos    CHILD   │
│    [Promover] [Revocar]         │
│                                 │
└─────────────────────────────────┘
```

### 7.6 Historial (opcional)
Lista de las últimas vinculaciones hechas desde este dispositivo.

---

## 8. Identidad Visual

### Colores (mismos que el sistema web)

```js
const colors = {
  black:  '#1E1E1E',  // background principal
  dark:   '#252525',  // cards
  input:  '#2D2D2D',  // inputs
  border: '#363636',
  pink:   '#E385A4',  // acento primario (CTA, activo)
  yellow: '#F6D525',  // logo, puntos destacados
  muted:  '#A0A0A0',  // texto secundario
  white:  '#FFFFFF',
}
```

### Tipografía
- **Headings**: Anton (Google Fonts) — bold, condensed, letra apretada
- **Body**: Montserrat (Google Fonts) — semi-bold para legibilidad en pantalla pequeña

En React Native usar `@expo-google-fonts/anton` y `@expo-google-fonts/montserrat`.

### Estilo general
- Fondo oscuro `#1E1E1E`, texto blanco
- Cards con `borderRadius: 20` y fondo `#252525`
- Botón primario: fondo `#E385A4` (pink), texto negro bold
- Botón secundario: borde `#363636`, texto blanco
- Sombra offset en botones CTA: `shadowColor: '#E385A4', shadowOffset: {width: 4, height: 4}`
- Animación de NFC scanning: `Animated.loop` con escala y opacidad pulsante

---

## 9. Configuración del Entorno

### Variables de entorno (`.env` en la app Expo)

```env
EXPO_PUBLIC_API_URL=http://192.168.X.X:3000
# Usar IP local de la máquina que corre el backend Next.js
# En producción: https://blackbeer.tudominio.com
```

### Autenticación entre app y backend
La app NFC no usa NextAuth (es React Native). Flujo:
1. Al registrar el dispositivo, el backend devuelve un token JWT firmado con `NEXTAUTH_SECRET`
2. La app guarda este token en `expo-secure-store`
3. Todas las requests van con `Authorization: Bearer <token>`
4. El backend valida el token y verifica que el `deviceId` esté autorizado

---

## 10. Estructura de Carpetas Sugerida

```
blackbeer-nfc/
├── app/
│   ├── _layout.tsx          # Stack navigation root
│   ├── index.tsx            # Splash / auth check
│   ├── pending.tsx          # Pantalla PENDING
│   ├── home.tsx             # Vincular tarjeta (CHILD/PARENT)
│   └── devices.tsx          # Gestión dispositivos (solo PARENT)
├── components/
│   ├── NfcScanArea.tsx      # Animación y lógica NFC
│   ├── DeviceCard.tsx       # Card de dispositivo en la lista
│   └── ConfirmModal.tsx     # Modal de confirmación de vinculación
├── hooks/
│   ├── useNfc.ts            # Wrapper de react-native-nfc-manager
│   ├── useDevice.ts         # Estado del dispositivo (authorized, role)
│   └── useApi.ts            # Axios instance + auth header
├── lib/
│   ├── api.ts               # Funciones de API (fetchDevice, linkCard, etc.)
│   ├── storage.ts           # expo-secure-store helpers
│   └── constants.ts         # Colors, fonts, API_URL
└── types/
    └── index.ts             # Tipos compartidos
```

---

## 11. Comandos para Arrancar

```bash
# Inicializar
npx create-expo-app blackbeer-nfc --template blank-typescript
cd blackbeer-nfc

# Dependencias
npx expo install expo-nfc-manager expo-secure-store expo-camera expo-device
npm install react-native-nfc-manager @tanstack/react-query axios
npx expo install nativewind tailwindcss
npm install @expo-google-fonts/anton @expo-google-fonts/montserrat expo-font

# Development
npx expo start
# Escanear QR con Expo Go en Android
# Para iOS: usar build de desarrollo (expo-nfc-manager requiere native build)
```

### Nota sobre iOS y NFC
`react-native-nfc-manager` **no funciona en Expo Go en iOS** porque requiere el entitlement `com.apple.developer.nfc.readersession.formats`. Se necesita hacer un **development build**:

```bash
npx expo run:ios
# o
eas build --profile development --platform ios
```

En Android, sí funciona con Expo Go si el dispositivo tiene NFC.

---

## 12. Checklist de Implementación

- [ ] Setup Expo + TypeScript + NativeWind
- [ ] Implementar `expo-secure-store` para deviceId + token
- [ ] Crear endpoint `POST /api/nfc/devices` en Next.js (con bootstrapping PARENT)
- [ ] Crear endpoint `GET /api/nfc/devices/me` (verificar autorización)
- [ ] Crear endpoint `PATCH /api/tarjetas/:id/nfc` en Next.js
- [ ] Agregar modelo `NfcDevice` a Prisma schema y migrar
- [ ] Pantalla Splash con auto-registro de dispositivo
- [ ] Pantalla PENDING con código de dispositivo
- [ ] Pantalla Home con NFC scan + barcode fallback
- [ ] Pantalla Confirmación de vinculación
- [ ] Pantalla de gestión de dispositivos (PARENT only)
- [ ] Development build para iOS (NFC entitlement)
- [ ] Testing en Android (Expo Go) y iOS (dev build)

---

*Proyecto: Blackbeer Sistema de Puntos — App NFC Writer*  
*Fecha: Octubre 2026*  
*Relacionado con: Next.js backend en `/demo BLACKBEER/blackbeer/`*
