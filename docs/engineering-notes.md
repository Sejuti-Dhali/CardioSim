# CardioSim — Evidence boundaries and technical notes

## Source and scope
The April 2024, 52-page KUET report includes physiological background, chamber-volume and pressure equations, subsystem Simulink diagrams, and simulated graphs. Here, pages 36–48 are preserved as page-image documentation. These are **reported outcomes**, not rerun or independently validated results.

## Model categories
The report discusses a zero-dimensional lumped parameter cardiovascular approach with heart chamber, vascular system, and valve elements. Its equations address pressure, flow and volume, resistances, compliances, inertances and chamber contraction.

The interactive website is purposely simpler: HR×SV, 60/HR, EDV−SV and a schematic pressure–volume curve. Any displayed slider interaction is an educational *what-if* and cannot be used to infer disease or individual physiology.

## Reproducibility roadmap
1. Obtain `.slx` file from contributors with appropriate consent.
2. Record initial conditions, solver version, parameter values and units.
3. Export pressure, volume and flow time series.
4. Compare reported plots against regenerated figures.
5. Validate mass balance and flow continuity across chambers and vessel networks.
6. Disclose numerical uncertainty and calibration limitations.

## Authorship
The original MATLAB/Simulink work is documented in the cited April 2024 KUET report. This repository provides a separate educational web visualization; it does not claim independent reproduction of the source model.
