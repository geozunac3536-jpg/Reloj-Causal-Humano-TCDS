# ⚠️ TCDS Causal Clock v1.5 - Industrial & Commercial Notice

> **TECHNOLOGY READINESS LEVEL (TRL): 6**
> *System Validated in Relevant Environment (Distributed Web/Mobile Network)*
> **DOI:** [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17677864.svg)](https://doi.org/10.5281/zenodo.17677864)

---

## 🛑 CONDICIONES DE USO Y LICENCIAMIENTO

Este software es un activo de investigación científica protegido bajo la licencia **CC BY-NC-SA 4.0** (Atribución - No Comercial - Compartir Igual).

### **LO QUE ESTO SIGNIFICA PARA USTED:**
1.  **Uso Científico/Personal:** ✅ **GRATUITO.**
    * Puede auditar el código, desplegar nodos personales y contribuir a la ciencia ciudadana.
2.  **Uso Comercial/Gubernamental:** ⛔ **ESTRICTAMENTE PROHIBIDO.**
    * Si usted representa a una **Aseguradora, Gobierno, Fondo de Inversión o Entidad Corporativa**, el uso de este código, su API o los datos generados (Data-Stream) para toma de decisiones, análisis de riesgo o lucro requiere un acuerdo de **Transferencia de Tecnología (TCDS-Commercial)**.

> **🚫 AVISO A INVERSIONISTAS Y PARTNERS:**
> Este proyecto no acepta propuestas de desarrollo a cambio de equidad ("sweat equity") ni compras de IP por debajo de la valoración de mercado para activos **TRL 6** con DOI registrado. El algoritmo de *Filtrado Shannon/Arnold* y la lógica *Q-Driven* son propiedad intelectual cerrada para implementaciones comerciales.

**CONTACTO PARA LICENCIA ENTERPRISE:**
📩 [geozunac3536@gmail.com,  8125989868]

---

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17677864.svg)](https://doi.org/10.5281/zenodo.17677864)
# Reloj Causal Humano — TCDS

Este repositorio contiene un nodo web experimental de la **Teoría Cromodinámica Sincrónica (TCDS)** que utiliza los sensores del dispositivo móvil para visualizar, en tiempo real:

- Una **aguja t_C (cian)** que representa el índice de tiempo causal local a partir de la magnitud de la aceleración total \(|a|\) (acelerómetro + gravedad).
- Una **aguja de frecuencia dominante (magenta)** que muestra la frecuencia pico del espectro de \(|a|\), calculado mediante una FFT sobre una ventana deslizante de muestras.
- Ambas agujas comparten el mismo **aro coherencial**, pero cada una lee una “regla” distinta:
  - t_C: mapeo 0–20 m/s² → −60° a +60°.
  - f_dom(|a|): mapeo 0–f_Nyquist → −150° a +150°.

El resultado es un **“Reloj Causal Humano”** que convierte el ruido de movimiento del entorno en un índice visual de coherencia dinámica (t_C) y estructura espectral (f_dom).

🌍 Únete a la Red Global de Coherencia TCDS
El Reloj Causal Humano es más que un experimento; es una red distribuida de ciencia ciudadana. Para validar el paradigma TCDS (Teoría Cromodinámica Sincrónica) y detectar precursores sísmicos antes que los sistemas tradicionales, necesitamos alcanzar la Masa Crítica de Nodos.
📱 ¿Cómo funciona tu contribución?
Tu dispositivo móvil se convierte en un sensor de alta precisión que mide la Entropía de Shannon (\Delta H) del ruido ambiental. Al conectarte, ayudas a filtrar el caos y detectar la "Señal Q" (Coherencia Estructural) que precede a los grandes eventos.
 * Sin descargas: Todo ocurre en el navegador.
 * Sin costo: Consumo de datos marginal (< 10 MB/noche).
 * Sin riesgos: No accedemos a tu cámara, micrófono ni archivos. Solo acelerómetro anónimo.
🚀 Instrucciones para Convertirte en Nodo
Sigue estos pasos para integrar tu dispositivo a la red de monitoreo en tiempo real:
 * Accede al Sensor:
   Abre el siguiente enlace en tu navegador móvil (Chrome/Safari recomendado):
   👉 https://reloj-causal-humano-tcds.vercel.app/
 * Activa los Permisos:
   Toca el botón "ACTIVAR NODO". Tu navegador te pedirá permiso para usar los sensores de movimiento. Acepta para iniciar la telemetría.
 * Mantén la Vigilia:
   Deja la pestaña abierta.
   * Modo Ideal: Conecta tu celular al cargador y déjalo en una superficie plana y firme (mesa de noche, escritorio) mientras duermes.
   * El sistema evitará que la pantalla se apague por completo o seguirá funcionando en segundo plano (dependiendo de tu SO).
 * Monitorea la Red:
   Puedes ver tu contribución y el estado global de la coherencia en el Dashboard Maestro desde cualquier PC:
   👉 https://reloj-causal-humano-tcds.vercel.app/dashboard.html
🛡️ Privacidad y Ciencia Abierta
Cada dato enviado es anónimo y encriptado. Tu participación ayuda a construir una base de datos pública y auditada para la predicción de riesgos naturales.
> "La coherencia de un sistema no depende de la fuerza de sus partes, sino de la sincronización de sus nodos." — Paradigma TCDS

---

## Uso

1. Abre la página:

   > https://geozunac3536-jpg.github.io/Reloj-Causal-Humano-TCDS/

2. Toca la pantalla una vez y concede permiso para acceder a los sensores de movimiento.
3. Mueve ligeramente el teléfono:
   - La aguja **cian** responde a cambios en \(|a|\) (postura, vibraciones, sacudidas).
   - La aguja **magenta** responde a la **frecuencia dominante** del movimiento (caminar, vibrar sobre una superficie, etc.).

---

## Detalles técnicos

- El experimento usa el evento `DeviceMotionEvent` del navegador (aceleración incluyendo gravedad).
- Se calcula:
  - \(|a| = \sqrt{a_x^2 + a_y^2 + a_z^2}\)
  - Una FFT radix-2 sobre las últimas \(N = 512\) muestras de \(|a|\).
- La tasa de muestreo \(f_s\) se estima a partir de los intervalos `performance.now()`, y de ahí:
  - Resolución de frecuencia: \( \Delta f = f_s / N \)
  - Frecuencia de Nyquist: \( f_{\text{Nyq}} = f_s / 2 \)
  - Frecuencia pico: \( f_{\text{peak}} = k_{\text{max}} \cdot \Delta f \)

El reloj está optimizado para Chrome en Android. Otros navegadores pueden aplicar restricciones adicionales a los sensores.

---

## Marco TCDS

Este nodo se enmarca en el paradigma TCDS como:

- Un **coherencímetro local** basado en:
  - Campo de movimiento (acelerómetro) → proxi de fricción \(\phi\).
  - Espectro de \(|a|\) → estructura de ventanas t_C.
- Fase actual:
  - **Lectura φ-driven y t_C-driven** sin Filtro de Honestidad aún (E-Veto pendiente).
  - Próximos pasos: integrar métricas Σ (LI, R, ΔH) sobre series de tiempo de \(|a|\) y acoples con texto (sincronograma psíquico).
# ⚠️ TCDS Causal Clock v1.5 — Industrial & Commercial Notice  
**Technology Readiness Level (TRL): 6**  
*Validated in Relevant Environment — Distributed Web/Mobile Network*

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17677864.svg)](https://doi.org/10.5281/zenodo.17677864)

---

## 🛑 Condiciones de Uso y Licenciamiento

Este software está protegido por **Licencia Dual**:

### **1) Licencia Pública — CC BY-NC-SA 4.0**
Uso permitido:
- Auditoría científica  
- Investigación académica  
- Uso personal / educativo / no lucrativo  
- Forks con obligación de compartir igual  

Restricciones:
- **Prohibido** usarlo para toma de decisiones financieras, gubernamentales, industriales o de riesgo.  
- **Prohibido** integrar el código en cualquier producto remunerado.  

---

### **2) Licencia Comercial — TCDS-Commercial License (Enterprise)**  
Requerida para:
- Aseguradoras  
- Gobiernos / Protección Civil  
- Centros sísmicos  
- Fondos de inversión  
- Empresas tecnológicas  
- Plataformas de riesgo y scoring  

Incluye:
- Parámetros avanzados del backend  
- Modelo predictivo calibrado (Shannon/Arnold)  
- E-Veto industrial  
- Protocolos ΣFET  
- Soporte técnico + integración  

🔒 *Las versiones públicas de `/api/reports` y `/api/config` contienen valores genéricos.  
La calibración profesional es propietaria y NO está en GitHub.*

Para licencias Enterprise:  
📧 **genarocarrasco.ozuna@gmail.com**  

---

## 🧠 Filosofía del Proyecto
El sistema TCDS v1.5 sustituye infraestructura física de alto costo (sismógrafos + estaciones GNSS) con una red digital distribuida de costo marginal cero, basada en **coherencia Q-driven**, métricas Σ y un backend auditable (E-Veto).

---

## 📌 Arquitectura del Sistema
- **index.html** → Nodo móvil / sensor local  
- **dashboard.html** → Master Node / control global  
- **/api/reports** → Ingesta, agregados, Alerta TCDS  
- **/api/config** → Control remoto de nodos  
- **metadata/** → JSON-LD oficial  
- **docs/** → Dossier TRL-6 y PDFs  

---

## 🧷 Declaración para Corporativos
**Este repositorio NO acepta compras oportunistas ni propuestas a descuento.**

Toda la propiedad intelectual está registrada vía DOI, ORCID y metadatos JSON-LD.  
Cualquier uso indebido puede derivar en un **CEASE & DESIST internacional**.

---

## 📄 Citación
Genaro Carrasco Ozuna (2025).  
**TCDS — Reloj Causal Humano v1.5 (TRL-6)**.  
DOI: 10.5281/zenodo.17677864.
---
## DOI y referencia

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17677864.svg)](https://doi.org/10.5281/zenodo.17677864)

Si utilizas el **Reloj Causal Humano TCDS** en publicaciones científicas o técnicas, cita:

> Carrasco Ozuna, G. (2025). *TCDS_Reloj_Causal_v1.5 — Reloj Causal Humano (Filtro Shannon/Arnold, Σ-metrics y Sincronización Q-Driven)* (Version v1) [Software]. Zenodo. https://doi.org/10.5281/zenodo.17677864
## Autoría y contacto

- **Autor / Arquitecto causal:** Genaro Carrasco Ozuna  
- **ORCID:** https://orcid.org/0009-0005-6358-9910  
- **Ko-fi:** https://ko-fi.com/genarocarrasco  

Este repo forma parte del ecosistema de la **Teoría Cromodinámica Sincrónica (TCDS)** y sus experimentos asociados (Σ-FET, Reloj Causal, Segundo Coherencial, Σ-metrics, etc.).
