# CardioSim — Cardiovascular Modeling Laboratory

A report-grounded educational web portfolio demonstrating cardiovascular subsystem architecture and an independent, illustrative cardiac-output/pressure–volume visualization.

**Live website:** https://sejuti-dhali.github.io/CardioSim/

## Evidence source

*Modeling and simulation of Cardiovascular System Using Simulink*, BME 3114, Biomedical Modeling and Simulation Laboratory, Department of Biomedical Engineering, Khulna University of Engineering & Technology, April 2024, 52 pages. The cover credits a six-member Group 1. Source-reported Simulink block diagrams and output figures are reproduced as labeled full-page extracts from pages 36–48, subject to the original authors' authorization.

## Interactive educational model

- Heart rate, stroke volume, end-diastolic volume and an illustrative peak LV pressure can be changed using accessible sliders.
- Cardiac output is calculated as HR × SV in L/min.
- Cycle duration is 60/HR in seconds.
- End-systolic volume is estimated as EDV − SV.
- The pressure–volume loop is **schematic**, not the numerical integration of the original coupled Simulink system.

## Important limitations

The native `.slx` project, complete parameter tables, solver configurations and numeric time series were not supplied. This repository **does not** claim independent reproduction of the full source model or clinical applicability. Illustrations and what-if inputs are not patient observations.

## Project structure

- `index.html`: public portfolio
- `assets/style.css`: responsive design
- `assets/app.js`: standalone demonstration model
- `assets/report/`: page-image extracts from the source PDF
- `docs/engineering-notes.md`: provenance and reproducibility roadmap
- `tests/verify.js`: static source and arithmetic checks
- `.github/workflows/pages.yml`: GitHub Pages deployment

## Local run and validation

Open `index.html` in a browser. With Node.js installed, run `node tests/verify.js`.

## Credit and reuse

The source report lists multiple contributors. Repository ownership does not imply sole authorship of its Simulink implementation. Check contributor consent and permissions before redistributing any source-derived figures.
