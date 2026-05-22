import type { CanonicalQuestion } from '../../../predictionTypes';

// Source: NCERT Class 10 Science — Chapter 12: Magnetic Effects of Electric Current (jesc112.pdf)
// topicKey: "magnetic-effects-of-electric-current"
// Extraction date: 2026-05-22
// Syllabus: CBSE 2026-27
// Coverage: All in-text question sets (after §12.1, §12.2.4, §12.3, §12.4) + 2 worked examples + 9 exercises

export const MAG_NCERT: CanonicalQuestion[] = [
  // ===== §12.1 In-text Question =====
  { id: "MAG-NCERT-12-SA-001", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Why does a compass needle get deflected when brought near a bar magnet?",
    answer: "A compass needle is itself a small bar magnet with a north and a south pole. When brought near a bar magnet, the magnetic field of the bar magnet exerts a force on the poles of the needle — attracting the unlike pole and repelling the like pole. This couple of forces produces a torque that rotates the needle until it aligns along the direction of the bar magnet's magnetic field.",
    solutionSteps: ["A compass needle is a small freely-pivoted bar magnet with N- and S-poles.", "The bar magnet produces a magnetic field in the surrounding region.", "This external field exerts forces on the poles of the compass needle (attracting unlike poles, repelling like poles).", "The resulting torque rotates the needle until it aligns along the magnetic field direction → deflection observed."],
    finalAnswer: "Because the needle itself is a small magnet, and the bar magnet's field exerts a torque that aligns the needle along its field.",
    ncertRef: "In-text Q1 §12.1", isCompetencyBased: false },

  // ===== §12.2.4 In-text Questions (after Circular Loop / before Solenoid set finishes) =====
  // Q1 — circular loop in plane of table, current clockwise; apply right-hand rule
  // REQUIRES-FIGURE: schematic of circular loop lying in plane of table with current direction shown clockwise
  { id: "MAG-NCERT-12-SA-002", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field due to Circular Loop", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Consider a circular loop of wire lying in the plane of the table. Let the current pass through the loop clockwise. Apply the right-hand rule to find out the direction of the magnetic field inside and outside the loop.",
    answer: "Curl the fingers of the right hand along the direction of current flow (clockwise as seen from above). The thumb (or the direction the fingers point through the loop) gives the magnetic-field direction at the centre. With clockwise current viewed from above, the magnetic field inside the loop points DOWNWARDS (into the table, away from the observer). Outside the loop, the field comes back UPWARDS (out of the table, towards the observer), so that the field lines close on themselves.",
    solutionSteps: ["Apply the right-hand thumb rule: curl the fingers of the right hand in the direction of current flow.", "Current is clockwise as seen from above the table, so when fingers curl clockwise, the thumb points downwards (into the table).", "Hence inside the loop the magnetic field points downwards (into the table).", "Field lines are closed curves, so outside the loop the field points upwards (out of the table)."],
    finalAnswer: "Inside the loop: into the table (downwards). Outside the loop: out of the table (upwards).",
    ncertRef: "In-text Q1 §12.2.4", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: circular loop in plane of table with clockwise current arrows" },

  // REQUIRES-FIGURE: diagram showing uniform magnetic field as equispaced parallel lines
  { id: "MAG-NCERT-12-SA-003", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Uniform Magnetic Field", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "The magnetic field in a given region is uniform. Draw a diagram to represent it.",
    answer: "A uniform magnetic field has the same magnitude and direction at every point in the region. It is represented by parallel, straight field lines that are equally spaced and pointing in the same direction (for example, all arrows pointing from left to right). Equal spacing shows equal strength everywhere; parallel arrows show the same direction. The interior of a long solenoid carrying a steady current is a real-world example.",
    solutionSteps: ["A uniform magnetic field has the same magnitude and direction at every point.", "Magnitude same → field lines must be equally spaced (closeness shows strength).", "Direction same → field lines must be parallel and pointing the same way.", "Diagram: draw several straight, equispaced, parallel arrows (e.g., horizontal arrows pointing right). The interior of a long solenoid shows this pattern."],
    finalAnswer: "Equally spaced parallel straight arrows pointing in the same direction.",
    ncertRef: "In-text Q2 §12.2.4", isCompetencyBased: false,
    strategyHint: "REQUIRES-FIGURE: uniform-field diagram with parallel equispaced arrows" },

  { id: "MAG-NCERT-12-MCQ-001", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field due to Solenoid", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Choose the correct option. The magnetic field inside a long straight solenoid-carrying current",
    options: ["is zero.", "decreases as we move towards its end.", "increases as we move towards its end.", "is the same at all points."],
    answer: "is the same at all points.",
    solutionSteps: ["Inside a long current-carrying solenoid, the field lines are parallel straight lines.", "This means the magnetic field has the same magnitude and direction at every interior point — the field is uniform.", "Hence option (d) is correct."],
    finalAnswer: "Option (d): is the same at all points.",
    ncertRef: "In-text Q3 §12.2.4", isCompetencyBased: false },

  // ===== §12.3 In-text Questions (after Fleming's left-hand rule) =====
  { id: "MAG-NCERT-12-MCQ-002", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Force on Moving Charge", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Which of the following property of a proton can change while it moves freely in a magnetic field? (There may be more than one correct answer.)",
    options: ["mass", "speed", "velocity", "momentum"],
    answer: "velocity",
    solutionSteps: ["The magnetic force on a moving charge is always perpendicular to its velocity, so it does no work on the proton — the kinetic energy and the SPEED stay constant.", "The mass of a proton is a fundamental property and does not change.", "However, the direction of motion changes continuously because of the perpendicular force → the velocity vector changes.", "Since velocity changes, momentum (a vector, p = m v) also changes in direction.", "Correct properties that can change: velocity and momentum (both vectors)."],
    finalAnswer: "Velocity and momentum can change (both are vectors); mass and speed do not change.",
    ncertRef: "In-text Q1 §12.3", isCompetencyBased: true },

  { id: "MAG-NCERT-12-SA-004", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Force on Current-carrying Conductor", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "In Activity 12.7 (a current-carrying aluminium rod suspended in a horse-shoe magnet's field), how do we think the displacement of rod AB will be affected if (i) current in rod AB is increased; (ii) a stronger horse-shoe magnet is used; and (iii) length of the rod AB is increased?",
    answer: "The force on a current-carrying conductor in a magnetic field is given by F = BIL (when current is perpendicular to field). Displacement depends directly on this force. (i) Increasing the current I → larger force → larger displacement of rod AB. (ii) Stronger horse-shoe magnet → larger B → larger force → larger displacement. (iii) Greater length L of the rod inside the field → larger force → larger displacement.",
    solutionSteps: ["Force on a current-carrying conductor placed perpendicular to a magnetic field: F = B I L.", "(i) If current I increases (B and L constant) → force F increases → displacement of rod increases.", "(ii) If a stronger horse-shoe magnet is used, B increases → F = B I L increases → displacement increases.", "(iii) If length L of the rod inside the field is increased → F increases → displacement increases.", "Conclusion: in each case the displacement increases."],
    finalAnswer: "In all three cases the displacement of rod AB increases (F = BIL grows with I, B and L).",
    ncertRef: "In-text Q2 §12.3", isCompetencyBased: true },

  { id: "MAG-NCERT-12-MCQ-003", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Fleming's Left-hand Rule", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A positively-charged particle (alpha-particle) projected towards west is deflected towards north by a magnetic field. The direction of magnetic field is",
    options: ["towards south", "towards east", "downward", "upward"],
    answer: "upward",
    solutionSteps: ["Apply Fleming's left-hand rule for a positive charge: first finger → magnetic field (B), middle finger → current direction (same as motion of +ve charge, here towards west), thumb → force (here towards north).", "Set the middle finger pointing west (direction of motion of the +ve alpha particle) and the thumb pointing north (direction of deflection / force).", "With these two fingers fixed, the first finger (B) then points upward — out of the ground.", "Therefore the magnetic field is directed upward — option (d)."],
    finalAnswer: "Option (d): upward.",
    ncertRef: "In-text Q3 §12.3", isCompetencyBased: true,
    strategyHint: "For +ve charge, current direction = direction of motion. Use Fleming's left-hand rule." },

  // ===== §12.4 In-text Questions (Domestic circuits) =====
  { id: "MAG-NCERT-12-SA-005", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Domestic Circuit Safety", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Name two safety measures commonly used in electric circuits and appliances.",
    answer: "Two common safety measures are: (1) Electric fuse — a thin wire of low melting point connected in series with the live wire. When current rises abnormally (overloading or short-circuiting), Joule heating melts the fuse and breaks the circuit, protecting appliances. (2) Earthing — the metallic body of an appliance is connected to the earth wire (green insulation) which leads to a metal plate buried deep in the earth. Any leakage current flows to earth instead of through the user, preventing severe shocks.",
    solutionSteps: ["Safety measure 1 — Electric fuse: a low-melting-point wire in series with the live wire; melts and breaks the circuit when current exceeds the safe limit (overloading / short-circuit).", "Safety measure 2 — Earthing: metallic body of the appliance is connected via the green earth wire to a metal plate buried in the ground.", "Earthing provides a low-resistance path for any leakage current → user does not get a shock.", "Together, fuse + earthing protect both the appliance and the user."],
    finalAnswer: "Electric fuse (protects against overloading/short-circuit) and earthing (protects user from shock).",
    ncertRef: "In-text Q1 §12.4", isCompetencyBased: false },

  { id: "MAG-NCERT-12-SA-006", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Overloading and Fuse Rating", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "An electric oven of 2 kW power rating is operated in a domestic electric circuit (220 V) that has a current rating of 5 A. What result do you expect? Explain.",
    answer: "Current drawn by the oven I = P / V = 2000 W / 220 V ≈ 9.09 A. This is much greater than the circuit's current rating of 5 A. The circuit will be overloaded — the fuse will melt and break the circuit (or wires may overheat). The oven cannot be safely operated on this 5 A circuit; it should be connected to a separate 15 A circuit meant for high-power appliances.",
    solutionSteps: ["Use P = V × I → I = P / V.", "Substitute: I = 2000 W ÷ 220 V ≈ 9.09 A.", "Circuit's safe current rating is 5 A, but the oven draws ≈ 9.09 A, which is well above the limit.", "The circuit is overloaded → the fuse melts and breaks the circuit; otherwise wires overheat and may cause a fire.", "Hence the oven must be operated on a higher-rating (e.g., 15 A) circuit."],
    finalAnswer: "Oven draws ≈ 9.09 A > 5 A rating → overloading → fuse blows. Use a 15 A circuit instead.",
    ncertRef: "In-text Q2 §12.4", isCompetencyBased: true,
    strategyHint: "Use I = P/V, compare with circuit rating." },

  { id: "MAG-NCERT-12-SA-007", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Avoiding Overloading", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "What precaution should be taken to avoid the overloading of domestic electric circuits?",
    answer: "Precautions: (i) Do not connect too many appliances to a single socket or circuit. (ii) Do not operate high-power appliances (geyser, air-conditioner, oven) on a low-current-rated circuit; use separate high-rating circuits (e.g., 15 A) for them. (iii) Use a fuse / MCB of appropriate rating in series with the live wire. (iv) Ensure good-quality insulation on wires so that the live and neutral wires do not touch (short-circuit). (v) Avoid sudden hikes in supply voltage — use stabilisers.",
    solutionSteps: ["Do not connect too many appliances to a single socket — total current must stay below the circuit's rating.", "Use separate high-rating circuits (e.g., 15 A) for high-power appliances such as geysers, ovens and air-coolers.", "Always use a fuse or MCB of the correct rating in the live line.", "Keep wires well-insulated to prevent short-circuits between live and neutral wires."],
    finalAnswer: "Avoid plugging too many appliances in one socket, use dedicated high-rating circuits for heavy appliances, use proper fuse/MCB, maintain insulation.",
    ncertRef: "In-text Q3 §12.4", isCompetencyBased: true },

  // ===== Worked Examples =====
  { id: "MAG-NCERT-12-SA-008", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Right-hand Thumb Rule", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A current through a horizontal power line flows in east to west direction. What is the direction of magnetic field at a point directly below it and at a point directly above it?",
    answer: "Apply the right-hand thumb rule. Point the right-hand thumb west (direction of current). The fingers curl around the wire: at a point directly below the wire the fingers point southwards, and at a point directly above the wire the fingers point northwards. Equivalently, looking from the east end the field lines circulate clockwise around the wire; looking from the west end they circulate anti-clockwise.",
    solutionSteps: ["Apply the right-hand thumb rule: thumb in the direction of current (east → west, so thumb points west).", "Fingers curl around the wire, giving the magnetic-field direction at any point around the wire.", "At a point directly BELOW the wire, the curling fingers point from north to south → field is directed towards SOUTH.", "At a point directly ABOVE the wire, the curling fingers point from south to north → field is directed towards NORTH.", "Viewed from the east end the field rotates clockwise; viewed from the west end it rotates anti-clockwise."],
    finalAnswer: "Below the wire: towards South. Above the wire: towards North.",
    ncertRef: "Example 12.1", isCompetencyBased: true,
    strategyHint: "Right-hand thumb rule. Visualise the wire in 3D before answering." },

  // REQUIRES-FIGURE: electron moving in plane of paper with magnetic field arrows
  { id: "MAG-NCERT-12-MCQ-004", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Fleming's Left-hand Rule", section: "A", marks: 1, format: "MCQ", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "An electron enters a magnetic field at right angles to it (see Fig. 12.14). The direction of force acting on the electron will be",
    options: ["to the right.", "to the left.", "out of the page.", "into the page."],
    answer: "into the page.",
    solutionSteps: ["Conventional current direction is opposite to the direction of motion of electrons (since electrons carry negative charge).", "Apply Fleming's left-hand rule using the magnetic-field direction and the conventional current direction.", "The thumb then gives the direction of force — which works out to be INTO the page.", "Hence option (d) is correct."],
    finalAnswer: "Option (d): into the page.",
    ncertRef: "Example 12.2", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: electron entering a horizontal magnetic field; apply Fleming's left-hand rule with current opposite to electron motion." },

  // ===== Exercises (p.206) =====
  { id: "MAG-NCERT-12-MCQ-005", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Magnetic Field due to Straight Conductor", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "Which of the following correctly describes the magnetic field near a long straight wire?",
    options: ["The field consists of straight lines perpendicular to the wire.", "The field consists of straight lines parallel to the wire.", "The field consists of radial lines originating from the wire.", "The field consists of concentric circles centred on the wire."],
    answer: "The field consists of concentric circles centred on the wire.",
    solutionSteps: ["Activity 12.5 / Fig. 12.6 show that iron filings around a current-carrying straight wire form concentric circles centred on the wire.", "The right-hand thumb rule confirms this circular pattern.", "Hence option (d) is correct."],
    finalAnswer: "Option (d): concentric circles centred on the wire.",
    ncertRef: "Exercise Q1", isCompetencyBased: false },

  { id: "MAG-NCERT-12-MCQ-006", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Short Circuit", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "At the time of short circuit, the current in the circuit",
    options: ["reduces substantially.", "does not change.", "increases heavily.", "vary continuously."],
    answer: "increases heavily.",
    solutionSteps: ["A short circuit happens when live and neutral wires come into direct contact (with negligible resistance between them).", "By Ohm's law I = V / R, if R becomes very small the current I becomes very large.", "Therefore at short circuit the current rises sharply (heavily) — option (c)."],
    finalAnswer: "Option (c): increases heavily.",
    ncertRef: "Exercise Q2", isCompetencyBased: false },

  { id: "MAG-NCERT-12-SA-009", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "True or False", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "State whether the following statements are true or false. (a) The field at the centre of a long circular coil carrying current will be parallel straight lines. (b) A wire with a green insulation is usually the live wire of an electric supply.",
    answer: "(a) TRUE — at the centre of a long circular coil (i.e., a solenoid) the magnetic-field lines are parallel straight lines, indicating a uniform field. (b) FALSE — green insulation is used for the EARTH wire, not the live wire. The live wire conventionally has red insulation (negative/neutral is black).",
    solutionSteps: ["(a) Inside a long solenoid, field lines are parallel straight lines → uniform field → TRUE.", "(b) In standard domestic wiring colours: red = live, black = neutral, green = earth.", "Green wire is therefore the earth wire, not the live wire → FALSE."],
    finalAnswer: "(a) True. (b) False — green is the earth wire.",
    ncertRef: "Exercise Q3", isCompetencyBased: false },

  { id: "MAG-NCERT-12-SA-010", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Producing Magnetic Field", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "List two methods of producing magnetic fields.",
    answer: "(1) Using a permanent magnet such as a bar magnet or horse-shoe magnet — its surrounding region has a magnetic field. (2) Passing an electric current through a conductor — a current-carrying straight wire, circular loop or solenoid produces a magnetic field around it (Oersted's discovery, 1820). A solenoid wound around a soft-iron core gives a strong electromagnet.",
    solutionSteps: ["Method 1: A permanent magnet (e.g., bar magnet, horse-shoe magnet) produces a magnetic field in its surrounding region.", "Method 2: An electric current flowing through a conductor (straight wire / circular loop / solenoid) creates a magnetic field around it.", "The second method is the basis of electromagnets — a solenoid with a soft-iron core."],
    finalAnswer: "(1) Permanent magnet; (2) electric current flowing through a conductor (e.g., solenoid → electromagnet).",
    ncertRef: "Exercise Q4", isCompetencyBased: false },

  { id: "MAG-NCERT-12-SA-011", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Force on Current-carrying Conductor", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "When is the force experienced by a current-carrying conductor placed in a magnetic field largest?",
    answer: "The force on a current-carrying conductor placed in a magnetic field is given by F = B I L sin θ, where θ is the angle between the direction of current and the direction of the magnetic field. The force is largest when sin θ = 1, that is, when θ = 90° — i.e., when the current is perpendicular (at right angles) to the magnetic field. In that case F_max = B I L.",
    solutionSteps: ["Force on a current-carrying conductor: F = B I L sin θ, where θ is the angle between I and B.", "F is largest when sin θ is largest, i.e., sin θ = 1 → θ = 90°.", "So the force is maximum when the conductor (current) is perpendicular to the magnetic field.", "Maximum value: F_max = B I L (Fleming's left-hand rule gives the direction)."],
    finalAnswer: "When the current is perpendicular to the magnetic field (θ = 90°); then F_max = BIL.",
    ncertRef: "Exercise Q5", isCompetencyBased: false },

  { id: "MAG-NCERT-12-SA-012", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Fleming's Left-hand Rule", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Imagine that you are sitting in a chamber with your back to one wall. An electron beam, moving horizontally from back wall towards the front wall, is deflected by a strong magnetic field to your right side. What is the direction of magnetic field?",
    answer: "The electron beam moves from back to front. Since electrons are negative, the conventional current is in the opposite direction — from front to back. The force on the beam is to the right of the observer. Apply Fleming's left-hand rule: point the middle finger from front to back (conventional current), the thumb to the right (force). The first finger then points VERTICALLY DOWNWARDS — so the magnetic field is directed vertically downwards.",
    solutionSteps: ["Electron motion is from back wall to front wall, so conventional current direction (opposite to electron motion) is from front to back.", "Force on the beam is towards the right of the observer.", "Apply Fleming's left-hand rule: middle finger = conventional current (front → back); thumb = force (right).", "The first finger (magnetic field) then points vertically DOWNWARDS.", "Hence the magnetic field is directed vertically downwards."],
    finalAnswer: "Vertically downwards.",
    ncertRef: "Exercise Q6", isCompetencyBased: true,
    strategyHint: "Reverse electron direction to get conventional current, then apply Fleming's left-hand rule." },

  { id: "MAG-NCERT-12-LA-001", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Rules for Field and Force Directions", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "State the rule to determine the direction of a (i) magnetic field produced around a straight conductor-carrying current, (ii) force experienced by a current-carrying straight conductor placed in a magnetic field which is perpendicular to it, and (iii) current induced in a coil due to its rotation in a magnetic field.",
    answer: "(i) RIGHT-HAND THUMB RULE: Hold the current-carrying straight conductor in your right hand such that the thumb points along the direction of the current. The fingers then curl around the wire in the direction of the magnetic-field lines. (ii) FLEMING'S LEFT-HAND RULE: Stretch the thumb, forefinger and middle finger of the left hand mutually perpendicular. If the forefinger points along the magnetic field and the middle finger along the current, the thumb gives the direction of the force on the conductor. (iii) FLEMING'S RIGHT-HAND RULE: Stretch the thumb, forefinger and middle finger of the right hand mutually perpendicular. The forefinger points along the magnetic field, the thumb along the direction of motion (rotation) of the conductor, and the middle finger then gives the direction of the induced current.",
    solutionSteps: ["(i) Right-hand thumb rule (or Maxwell's corkscrew rule) — thumb along current, fingers curl in the direction of magnetic-field lines around a straight current-carrying conductor.", "(ii) Fleming's left-hand rule — thumb, forefinger and middle finger of the LEFT hand mutually perpendicular: forefinger → B, middle finger → I, thumb → F (force on conductor).", "(iii) Fleming's right-hand rule — thumb, forefinger and middle finger of the RIGHT hand mutually perpendicular: forefinger → B, thumb → direction of motion of conductor, middle finger → direction of induced current.", "(i) is used for finding field direction; (ii) is used for motors; (iii) is used for generators / electromagnetic induction.", "Each rule is a 3D geometric mnemonic — none can replace another."],
    finalAnswer: "(i) Right-hand thumb rule; (ii) Fleming's left-hand rule; (iii) Fleming's right-hand rule.",
    ncertRef: "Exercise Q7", isCompetencyBased: false,
    strategyHint: "Three different rules — remember LEFT for motor force, RIGHT for induced current." },

  { id: "MAG-NCERT-12-SA-013", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Short Circuit", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "When does an electric short circuit occur?",
    answer: "An electric short circuit occurs when the live wire and the neutral wire come into direct contact with each other, bypassing the appliance. This can happen when the insulation on the wires is damaged, or when there is a fault inside an appliance. Because the resistance between live and neutral becomes very low, the current suddenly rises to a very large value (I = V/R). The fuse melts and breaks the circuit, preventing fire and damage.",
    solutionSteps: ["A short circuit occurs when the live (red) and neutral (black) wires touch each other directly — bypassing any appliance load.", "Typical causes: damaged insulation on wires, or a fault inside an appliance.", "The resistance between the wires becomes very low, so the current rises abruptly (I = V/R).", "This very high current melts the fuse (Joule heating) and breaks the circuit — preventing fire."],
    finalAnswer: "When live and neutral wires touch each other directly (insulation damage or appliance fault), causing a sudden surge of current.",
    ncertRef: "Exercise Q8", isCompetencyBased: false },

  { id: "MAG-NCERT-12-SA-014", subject: "Science", topicKey: "magnetic-effects-of-electric-current", subtopic: "Earthing", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What is the function of an earth wire? Why is it necessary to earth metallic appliances?",
    answer: "The earth wire (green insulation) is connected to a metal plate buried deep in the earth, near the house. It provides a low-resistance path for any leakage current from the metallic body of an appliance to flow safely into the ground. Metallic appliances (electric press, toaster, refrigerator, geyser, etc.) are earthed so that, in case the live wire accidentally touches the metal body, the current escapes to earth instead of through the user's body. This keeps the body of the appliance at earth potential and prevents severe electric shock.",
    solutionSteps: ["The earth wire (green insulation) is connected to a metal plate buried deep in the ground.", "It provides a low-resistance conducting path from the appliance's metal body to the earth.", "If the live wire ever touches the appliance's metallic body, the leakage current flows to earth (low resistance) instead of through the user.", "The body of the appliance is thus kept at earth potential → no shock to the user even on accidental contact."],
    finalAnswer: "Earth wire provides a safe low-resistance path for leakage current to flow to ground, keeping the appliance body at earth potential and preventing electric shocks.",
    ncertRef: "Exercise Q9", isCompetencyBased: true,
    strategyHint: "Mention low-resistance path AND prevention of shock." },
];
