
# TCDS_Reloj_Causal_v1.5 — Human Causal Clock (Σ-Metrics, Shannon Entropy & Arnold Filter)
**DOI:** https://doi.org/10.5281/zenodo.17677864  
**Author:** Genaro Carrasco Ozuna  
**ORCID:** https://orcid.org/0009-0005-6358-9910  
**Affiliation:** Proyecto TCDS — Motor Sincrónico de Luz (MSL), Mexico  

---

## 📘 Overview

**TCDS_Reloj_Causal_v1.5** is the official v1.5 release of the **TCDS Human Causal Clock**,  
a scientific web node based on the *Teoría Cromodinámica Sincrónica (TCDS)*.

This system performs real-time coherence analysis using:

- Accelerometer magnitude spectrum (FFT)
- **Σ-metrics** for coherence:
  - Locking Index (**LI**)
  - Correlation (**R**)
  - Stuart-Landau RMSE (**RMSE_SL**)
- **Shannon entropy (ΔH)** normalized and mapped to the E-Veto condition
- **Arnold spectral sharpness (Q_Arnold)**
- Combined evaluation through the **E-Veto** (ΔH ≤ −0.2)

The clock visualizes these metrics as causal time indicators and sends them to a  
serverless backend (`/api/reports`) that aggregates time windows and produces  
global dashboards (LI vs ΔH).

---

## 📂 Repository Structure

TCDS_Reloj_Causal_v1.5/ │ ├── 01_SOFTWARE_CODE/ │   ├── index.html │   ├── dashboard.html │   ├── api/ │   │   └── reports.js │   ├── metadata/ │   │   └── tcds_reloj_causal_metadata.jsonld │   ├── LICENSE │   ├── README.md │   └── package.json │ ├── 02_THEORETICAL_FRAMEWORK/ │   ├── La_TCDS.pdf │   ├── Auditoria.pdf │   ├── Energia.pdf │   └── Frecuencia_de_Ruptura.pdf │ ├── 03_DOCUMENTATION/ │   ├── README.md │   ├── METADATA.json │   └── LICENSE │ ├── MANIFIESTO.txt └── Modelo_Predictivo_Sísmico_TCDS_v1_5.pdf

---

## 🔬 Theoretical Framework Included

This release ships with the 4 canonical TCDS documents:

- **La_TCDS.pdf** — Σ-χ field theory, synchronization, Q·Σ = φ  
- **Auditoria.pdf** — Σ-Metrics falsification protocol  
- **Energia.pdf** — Σ-χ ontology formalism  
- **Frecuencia_de_Ruptura.pdf** — Arnold tongues & coherence-break frequency  

These form the theoretical foundation of the Human Causal Clock.

---

## 🔧 Features

- Real-time FFT processing on mobile devices  
- Shannon entropy computation (ΔH)  
- Coherence evaluation using Σ-Metrics  
- Arnold spectral sharpness detection  
- ΔH-driven E-Veto for apophenia rejection  
- Serverless backend for global coherence aggregation  
- Dashboard visualization (LI vs ΔH)  

---

## 🧠 Scientific Motivation

The Human Causal Clock is an experimental platform for testing the  
**TCDS paradigm**, which considers coherent dynamics as the driver of  
physical, biological, cognitive and technological systems.

This tool provides:

- high-resolution measurement of micro-coherence signals,  
- entropy-based honesty filtering (E-Veto),  
- and an extensible interface for coherence research.

---

## 🔗 Zenodo DOI & Citation

To cite this release:

Carrasco Ozuna, G. (2025). TCDS_Reloj_Causal_v1.5 — Σ-Metrics, Shannon Entropy & Arnold Filter. Zenodo. https://doi.org/10.5281/zenodo.17677864

The Zenodo record is available at:  
https://doi.org/10.5281/zenodo.17677864

---

## 📝 License

This project is released under:

- **CC BY-NC-SA 4.0**  
- **TCDS-Commercial License** (mandatory for commercial, industrial or hardware use)

See `03_DOCUMENTATION/LICENSE` for full details.

---

## 👤 Author

**Genaro Carrasco Ozuna**  
Architect of the TCDS theoretical framework  
orcid: https://orcid.org/0009-0005-6358-9910  
email: geozunac3536@gmail.com  
Affiliation: Proyecto TCDS — Motor Sincrónico de Luz (MSL), Mexico  

---

## 🧩 Related Projects

- TCDS — Teoría Cromodinámica Sincrónica  
- ΣFET — Coherence transistor prototype  
- CSL-H — Coherent State Logic for Human Systems  
- TCDS Predictive Seismology Framework  

---

## 📬 Contact

For scientific collaboration, licensing, or research inquiries:

**Email:** geozunac3536@gmail.com  
**Ko-fi:** https://ko-fi.com/genarocarrasco
