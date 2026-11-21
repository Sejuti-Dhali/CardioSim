# CardioSim — Interactive Cardiovascular Hemodynamics Laboratory

CardioSim is a browser-based, independent educational implementation of a simplified closed-loop cardiovascular compartment model.

**Website:** https://sejuti-dhali.github.io/CardioSim/

## Capabilities

- Interactive SVG model of four cardiac chambers and four vascular compartments.
- Eight physiological flow pathways, including four one-way cardiac valves.
- Draggable chamber and vessel blocks.
- Editable flow-connection curvature.
- Time-varying ventricular elastance and atrial activation.
- Pressure-dependent transfer flows with compartment volume conservation.
- Numerical trajectories for ventricular pressure, vascular pressure, ventricular volume and valve flow.
- Numerically computed left ventricular pressure–volume trajectory.
- Scenario inputs for heart rate, contractility, vascular resistance and circulating blood volume.
- Animated rhythm monitor and contextual component inspector.
- Separate results dashboard with calculated mean cardiac output and other metrics.

## Governing relationships

Compartment blood-volume balance:

dV_i/dt = sum(Q_in) - sum(Q_out)

One-way valve flows:

Q = max(0, (P_upstream - P_downstream) / R)

Simplified vascular pressure:

P = max(0, (V - V_unstressed) / C)

Simplified time-varying heart-chamber pressure:

P = max(0, E(t) * (V - V_unstressed))

The simulation uses a conservative explicit time-stepping scheme.

## Model scope

The mathematical concepts were informed by the supplied coursework report, *Modeling and simulation of Cardiovascular System Using Simulink*, BME 3114, KUET, April 2024.

This implementation is not a conversion or exact numerical reproduction of the original report's MATLAB/Simulink model. A native `.slx` file, full parameter tables and solver configuration were unavailable.

The app does not display report-page screenshots. All network components, plots and calculated metrics are generated within the web application.

## Validation

`node --check assets/app.js`

`node tests/verify.js`

These tests verify code structure and representative mathematical invariants; they do not establish clinical validation, numerical convergence or equivalence with the original Simulink outputs.

## Safety and limitations

- The model is simplified and not physiologically calibrated.
- The parameter presets are demonstrative examples.
- The simulation is not suitable for patient-specific interpretation.
- It is not a medical device or clinical decision-support tool.