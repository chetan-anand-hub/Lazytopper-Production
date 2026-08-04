import type { CanonicalQuestion } from "../../../predictionTypes";

export const MAGNETIC_EFFECTS_PACK1: CanonicalQuestion[] = [
  { id: "ME-E09", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding", questionText: "What are magnetic field lines? State two properties.", solutionSteps: [
      "Magnetic field lines are imaginary curves showing the direction and strength of magnetic field [½]",
      "Property 1: They emerge from North pole and enter South pole [½]",
      "Property 2: They never cross each other [1]",
    ], finalAnswer: "Imaginary lines showing field direction; N→S; never cross" , isCompetencyBased: false },
  { id: "ME-E13", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Domestic Circuits", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding", questionText: "What is the function of an earth wire in domestic circuits?", solutionSteps: [
      "Earth wire connects the metal body of appliance to the ground [½]",
      "If insulation fails and live wire touches the body, current flows to ground [½]",
      "This prevents electric shock and triggers the fuse [1]",
    ], finalAnswer: "Connects appliance body to ground; prevents shock during insulation failure" , isCompetencyBased: false },
  { id: "ME-M01", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electric Motor", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "Draw a labelled diagram of an electric motor. Explain its principle and working.", solutionSteps: [
      "Diagram: rectangular coil ABCD between poles of magnet, split ring commutator, brushes, battery; Principle: current-carrying conductor in magnetic field experiences a force (motor effect) [1]",
      "Working: current flows through coil → force on AB (up) and CD (down) by Fleming's left-hand rule [1]",
      "Coil rotates; at 180°, commutator reverses current direction → continuous rotation [1]",
    ], finalAnswer: "Labelled diagram; principle: force on current in field; commutator ensures continuous rotation" , visualExplainerId: "science-magnetic-effects-electric-motor-and-generator", isCompetencyBased: false },
  { id: "ME-M02", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "EMI", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "Explain electromagnetic induction. State Faraday's law.", solutionSteps: [
      "EMI: whenever magnetic flux through a coil changes, an EMF (and current, if circuit closed) is induced; Can be caused by: moving magnet near coil, moving coil in magnetic field, changing current in nearby coil [1]",
      "Faraday's law: The magnitude of induced EMF is proportional to the rate of change of magnetic flux [1]",
      "Direction given by Lenz's law: induced current opposes the change that causes it [1]",
    ], finalAnswer: "Changing magnetic flux induces EMF; EMF ∝ rate of flux change; opposes cause (Lenz's law)" , isCompetencyBased: false },
  { id: "ME-M03", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electromagnetism", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "Draw the magnetic field pattern around: (i) a straight current-carrying conductor (ii) a solenoid.", solutionSteps: [
      "Diagram: Draw a solenoid (tightly wound helical coil) connected to a battery. Show parallel magnetic field lines inside (uniform) and bar-magnet-like field lines outside. Label the N and S poles.; (i) Concentric circles centered on the conductor; direction by right-hand thumb rule [1]",
      "Closer circles = stronger field; spacing increases with distance; (ii) Solenoid: field lines inside are uniform and parallel (like bar magnet) [1]",
      "Outside, field lines curve from one end to the other (N to S) [1]",
    ], finalAnswer: "(i) Concentric circles (ii) Bar magnet-like pattern; uniform inside" , visualExplainerId: "science-magnetic-effects-electromagnet-and-solenoid", isCompetencyBased: false },
  { id: "ME-M05", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "EMI", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", questionText: "In a science lab, a student moved a bar magnet into a coil connected to a galvanometer.\n(i) What did the galvanometer show?\n(ii) What happened when the magnet was pulled out?\n(iii) What happened when the magnet was held stationary inside the coil?\n(iv) Name this phenomenon.", solutionSteps: [
      "(i) Galvanometer showed a deflection (induced current) [1]",
      "(ii) Deflection in opposite direction (current reversed) [1]",
      "(iii) No deflection (no change in magnetic flux = no induced current) [1]",
      "(iv) Electromagnetic induction [1]",
    ], finalAnswer: "(i) Deflection (ii) Opposite deflection (iii) No deflection (iv) Electromagnetic induction" , isCompetencyBased: true },
  { id: "ME-M06", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Domestic Circuits", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "Explain the domestic electric circuit with the three wires: live, neutral, and earth.", solutionSteps: [
      "Circuit Diagram: Draw the domestic household wiring circuit showing: Live wire (L, red/brown), Neutral wire (N, black/blue), Earth wire (E, green/yellow), MCB/fuse box, energy meter, and household appliances connected in parallel across L and N.; Live wire (red/brown): carries current at high potential (~220V) [1]",
      "Neutral wire (black/blue): at approximately zero potential; completes the circuit; Earth wire (green/yellow): connected to metal body of appliance and ground [1]",
      "Main supply → fuse/MCB → live wire branches to different circuits; Each circuit has its own fuse; appliances connected in parallel between live and neutral [1]",
    ], finalAnswer: "Live (220V), Neutral (~0V), Earth (safety); parallel circuits with fuses" , visualExplainerId: "science-magnetic-effects-electric-motor-and-generator", isCompetencyBased: false },
  { id: "ME-M08", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "EMI", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "Draw a labelled diagram of an AC generator. Explain its working principle.", solutionSteps: [
      "Diagram: rectangular coil between magnetic poles, slip rings, brushes, external load; Principle: electromagnetic induction — coil rotates in magnetic field, flux changes → EMF induced [1]",
      "Working: as coil rotates, flux through it changes continuously; EMF alternates direction every half rotation → alternating current (AC) [1]",
      "Slip rings (not split rings) maintain continuous contact [1]",
    ], finalAnswer: "Labelled AC generator; EMI principle; rotating coil → changing flux → AC output" , visualExplainerId: "science-magnetic-effects-electric-motor-and-generator", isCompetencyBased: false },
  { id: "ME-M10", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Force on Conductor", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing", questionText: "A wire carrying current is placed between two poles of a horseshoe magnet. The wire moves upward.\n(i) Name the rule used to find the direction of force.\n(ii) What happens if the current direction is reversed?\n(iii) What happens if the magnetic poles are interchanged?\n(iv) What happens if both current and field are reversed?", solutionSteps: [
      "(i) Fleming's left-hand rule [1]",
      "(ii) Force reverses → wire moves downward [1]",
      "(iii) Field reverses → force reverses → wire moves downward [1]",
      "(iv) Both reversed → force direction unchanged → wire still moves upward [1]",
    ], finalAnswer: "(i) Fleming's left-hand rule (ii) Moves down (iii) Moves down (iv) Moves up (both cancel)" , isCompetencyBased: true },
  { id: "ME-M12", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electromagnetism", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "What is the difference between an electromagnet and a permanent magnet?", solutionSteps: [
      "Electromagnet: temporary magnet made by passing current through a solenoid with iron core; strength can be changed [1]",
      "Permanent magnet: always magnetic; cannot be switched on/off; made of steel/hard magnetic material [1]",
    ], finalAnswer: "Electromagnet: temporary, controllable; Permanent: always on, fixed strength" , isCompetencyBased: false },
  { id: "ME-M14", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electric Motor", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "State Fleming's left-hand rule. Where is it applied?", solutionSteps: [
      "Stretch thumb, forefinger, and middle finger of left hand mutually perpendicular; Forefinger → direction of magnetic field (B) [½]",
      "Middle finger → direction of current (I); Thumb → direction of force/motion (F) [½]",
      "Applied to find force on current-carrying conductor in a magnetic field (electric motor) [1]",
    ], finalAnswer: "Three fingers: field, current, force; applied in electric motors" , isCompetencyBased: false },
  { id: "ME-H01", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electric Motor", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing", questionText: "Explain the principle, construction, and working of a DC motor with a labelled diagram. What is the role of each component?", solutionSteps: [
      "Diagram: Draw the electric motor (or generator) showing the rectangular coil ABCD between the poles of a magnet, commutator (motor) or slip rings (generator), carbon brushes, and external circuit.; Principle: current-carrying coil in magnetic field experiences force (motor effect) [1]",
      "Construction: armature coil, permanent magnets, split ring commutator, carbon brushes, axle; Armature coil: rectangular coil that rotates [1]",
      "Magnets: provide uniform magnetic field; Split ring commutator: reverses current every half rotation for continuous rotation [1]",
      "Brushes: provide sliding electrical contact to commutator [1]",
      "Working: current in coil → force on each arm (Fleming's left-hand rule) → coil rotates → commutator reverses current → continuous rotation [1]",
    ], finalAnswer: "Detailed DC motor with principle, construction, working, and component roles" , visualExplainerId: "science-magnetic-effects-electric-motor-and-generator", isCompetencyBased: true },
  { id: "ME-H02", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "EMI", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing", questionText: "Distinguish between AC and DC generators with respect to: (i) type of current produced (ii) type of rings used (iii) one application each.", solutionSteps: [
      "(i) AC generator: alternating current; DC generator: direct current [1]",
      "(ii) AC: slip rings; DC: split ring commutator [1]",
      "(iii) AC: household electricity supply; DC: charging batteries, electroplating [1]",
    ], finalAnswer: "(i) AC vs DC (ii) Slip rings vs split rings (iii) Household vs battery charging" , isCompetencyBased: true },
  { id: "ME-H03", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Force on Conductor", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating", questionText: "A wire of length 50 cm carrying a current of 2 A is placed perpendicular to a magnetic field of 0.5 T. Calculate the force on the wire. What happens if the wire is placed parallel to the field?", solutionSteps: [
      "F = BIl = 0.5 × 2 × 0.5 = 0.5 N [1]",
      "If wire is parallel to field, angle θ = 0° → F = BIl sin0° = 0 [1]",
      "No force acts when conductor is parallel to field [1]",
    ], finalAnswer: "F = 0.5 N (perpendicular); F = 0 (parallel)" , isCompetencyBased: true },
  { id: "ME-H04", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electromagnetism", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating", questionText: "An electrician was explaining the importance of MCB (Miniature Circuit Breaker) to a homeowner.\n(i) What does MCB stand for and what is its function?\n(ii) How does it differ from a fuse?\n(iii) What causes a short circuit in domestic wiring?\n(iv) Why is overloading dangerous?", solutionSteps: [
      "Circuit Diagram: Draw a household circuit with the MCB inserted in series on the live wire between the main supply and the domestic circuit, showing how an overload or short circuit causes the MCB to trip and break the circuit automatically.; (i) Miniature Circuit Breaker; automatically breaks circuit during overload/short circuit [1]",
      "(ii) MCB can be reset after tripping; fuse wire melts and must be replaced [1]",
      "(iii) Direct contact between live and neutral wires (damaged insulation, loose connections) [1]",
      "(iv) Overloading draws excessive current → wires overheat → fire risk [1]",
    ], finalAnswer: "(i) Auto circuit breaker (ii) Reusable vs single-use (iii) Live-neutral contact (iv) Overheating/fire" , visualExplainerId: "science-magnetic-effects-electric-motor-and-generator", isCompetencyBased: true },
  { id: "ME-H05", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "EMI", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating", questionText: "Explain the principle, construction, and working of an AC generator with a labelled diagram. Derive the expression for the induced EMF.", solutionSteps: [
      "Diagram: Draw the electric motor (or generator) showing the rectangular coil ABCD between the poles of a magnet, commutator (motor) or slip rings (generator), carbon brushes, and external circuit.; Principle: electromagnetic induction — rotating coil in magnetic field induces EMF [1]",
      "Construction: armature coil (ABCD), permanent magnets (N-S), slip rings, brushes, load; Working: coil rotates → magnetic flux changes → EMF induced (Faraday's law) [1]",
      "When coil is perpendicular to field: maximum flux change → maximum EMF; When coil is parallel to field: minimum flux change → zero EMF [1]",
      "EMF varies sinusoidally: e = NBA ω sin(ωt) = e₀ sin(ωt) [1]",
      "Where e₀ = NBAω is the peak EMF [1]",
    ], finalAnswer: "EMI principle; labelled diagram; e = NBAω sin(ωt) derived" , visualExplainerId: "science-magnetic-effects-electric-motor-and-generator", isCompetencyBased: true },
  { id: "ME-H06", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Analysing", questionText: "How does the magnetic field pattern of a current-carrying circular loop differ from that of a straight conductor? Where is the field strongest in a circular loop?", solutionSteps: [
      "Straight conductor: concentric circles around the wire, decreasing strength with distance; Circular loop: field lines are concentric near wire but appear as straight lines at the centre [1]",
      "At the centre of the loop, field contributions from all parts add up → strongest [1]",
      "For a coil with many turns, field at centre = n times that of single loop [1]",
    ], finalAnswer: "Straight: concentric circles; Circular: straight at centre; centre is strongest point" , isCompetencyBased: true },
  { id: "ME-H07", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electric Motor", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Evaluating", questionText: "In an electric motor, the coil stops rotating after half a rotation if a commutator is not present.\n(i) Why does the coil stop without a commutator?\n(ii) What does the commutator do?\n(iii) Name the type of commutator used in a DC motor.\n(iv) How can the speed of the motor be increased?", solutionSteps: [
      "(i) After half rotation, force reverses direction → torque reverses → coil oscillates and stops [1]",
      "(ii) Commutator reverses the current direction every half rotation → force always in same rotational direction [1]",
      "(iii) Split ring commutator [1]",
      "(iv) Increase current, increase number of turns, use stronger magnets [1]",
    ], finalAnswer: "(i) Force reverses (ii) Reverses current each half turn (iii) Split ring (iv) More current/turns/stronger magnets" , isCompetencyBased: true },
  { id: "ME-H08", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electromagnetism", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating", questionText: "Explain Oersted's experiment and its significance.", solutionSteps: [
      "Oersted placed a magnetic compass near a straight current-carrying conductor; When current was switched on, the compass needle deflected [1]",
      "When current direction was reversed, needle deflected in opposite direction; When current was off, needle returned to original position [1]",
      "Significance: proved that electric current produces a magnetic field (electromagnetism); Led to development of electromagnets, motors, generators [1]",
    ], finalAnswer: "Current deflects compass needle; proved electricity creates magnetic field" , isCompetencyBased: true },
  { id: "ME-H09", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Force on Conductor", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Evaluating", questionText: "State Fleming's left-hand rule and Fleming's right-hand rule. Explain where each is used with one application.", solutionSteps: [
      "Fleming's Left-Hand Rule: forefinger=field, middle=current, thumb=force/motion; Used when: current-carrying conductor in magnetic field → find force direction [1]",
      "Application: electric motor; Fleming's Right-Hand Rule: forefinger=field, thumb=motion, middle=induced current [1]",
      "Used when: conductor moves in magnetic field → find induced current direction [1]",
      "Application: AC/DC generator [1]",
      "Key difference: LHR for motor effect, RHR for generator effect [1]",
    ], finalAnswer: "LHR: motor (find force); RHR: generator (find induced current); detailed comparison" , isCompetencyBased: true },
  { id: "ME-H10", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Domestic Circuits", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Evaluating", questionText: "Why is the live wire more dangerous than the neutral wire? What precautions should be taken while handling electrical appliances?", solutionSteps: [
      "Live wire is at 220V potential; neutral is at ~0V; Touching live wire creates potential difference across body → current flows → electric shock [1]",
      "Touching neutral alone (if properly connected) poses less risk; Precautions: never touch bare wires, use insulated tools, switch off before repair [1]",
      "Ensure proper earthing, use MCB/fuse, avoid overloading circuits; Never use electrical appliances with wet hands [1]",
    ], finalAnswer: "Live at 220V → shock risk; neutral at ~0V; insulation, earthing, MCB, dry hands" , isCompetencyBased: true },
  { id: "ME-B05", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electromagnet", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding", questionText: "What is an electromagnet? State two properties that make it more useful than a permanent magnet.", answer: "Electromagnet = coil + iron core + current; useful because strength is variable and it can be switched off", solutionSteps: [
      "An electromagnet is a temporary magnet made by passing electric current through a coil of wire wound around a soft iron core [½]",
      "Properties: (1) its strength can be varied by changing the current; (2) it can be switched on and off by controlling the current [½]",
      "Permanent magnets cannot be turned off or easily varied — making electromagnets more flexible [1]",
    ], explanation: "Electromagnet = coil + iron core + current; useful because strength is variable and it can be switched off — see solution steps for the complete derivation.", finalAnswer: "Electromagnet = coil + iron core + current; useful because strength is variable and it can be switched off", isCompetencyBased: false },
  { id: "ME-D03", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Electromagnetic Induction", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing", questionText: "Explain the principle, construction, and working of an AC generator. How does it differ from a DC generator?", answer: "AC generator: rotating coil in magnetic field induces alternating EMF via slip rings; DC uses commutator to rectify", solutionSteps: [
      "AC generator principle: electromagnetic induction — rotating coil in magnetic field induces alternating EMF (Faraday's law) [1]",
      "Construction: rectangular coil of wire (armature) rotating between the poles of a strong magnet; two slip rings and brushes for external connection [1]",
      "Working: as coil rotates, flux through it changes; EMF alternates direction — produces alternating current (AC); one complete rotation = one cycle [1]",
      "DC generator: uses a split-ring commutator instead of slip rings; commutator reverses connection every half rotation to maintain current in one direction (DC) [1]",
      "In India, AC supply is at 50 Hz, 220 V [1]",
    ], explanation: "AC generator: rotating coil in magnetic field induces alternating EMF via slip rings; DC uses commutator to rectify — see solution steps for the complete derivation.", finalAnswer: "AC generator: rotating coil in magnetic field induces alternating EMF via slip rings; DC uses commutator to rectify", isCompetencyBased: true }
];
