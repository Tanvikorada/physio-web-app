import prisma from "../src/lib/prisma"

interface ExerciseSeedData {
  name: string
  categories: string[]
  trackingMode: string
  instructionsShort: string
  instructionsFull: string
  targetHoldSeconds?: number
  landmarkConfig?: any
  isActive?: boolean
}

const ACTIVE_EXERCISES = new Set([
  // Neck
  "Neck Rotation", "Neck Side Bending", "Neck Flexion", "Isometric Neck Flexion", "Levator Scapulae Stretch",
  // Shoulder (MUST include Shoulder Abduction)
  "Pendulum Exercise", "Shoulder Flexion", "Shoulder Abduction", "Internal Rotation", "Cross-Body Stretch",
  // Back
  "Pelvic Tilt", "Cat-Camel Stretch", "Bird Dog", "Child's Pose Stretch", "Seated Trunk Rotation",
  // Hip
  "Straight Leg Raise", "Hip Abduction", "Hip Extension", "Clamshell Exercise", "Glute Bridge",
  // Knee (MUST include Knee Flexion)
  "Heel Slides", "Short Arc Quad", "Hamstring Curl", "Mini Squats", "Knee Flexion",
  // Ankle & Foot
  "Ankle Pumps", "Heel Raises", "Toe Raises", "Calf Stretch", "Single-Leg Stand", // Wait, Single-Leg Stand is also in Balance. We'll use 5 distinct.
  // Wrist & Hand
  "Wrist Flexion", "Wrist Extension", "Wrist Pronation", "Finger Flexion", "Grip Strengthening",
  // Balance & Coordination
  "Weight Shifting", "Marching in Place", "Reaching Exercises", "Tandem Standing", "Side Stepping",
  // Walking (Gait)
  "Sit-to-Stand Practice", "Stair Climbing", "Backward Walking", "Step Length Training", "Assisted Walking",
  // Stretching
  "Hamstring Stretch", "Quadriceps Stretch", "Hip Flexor Stretch", "Chest Stretch", "Lower Back Stretch",
  // Strengthening
  "Squats", "Lunges", "Wall Push-Ups", "Resistance Band Row", "Bridge Exercise",
  // Range of Motion (ROM)
  "Shoulder ROM", "Elbow ROM", "Hip ROM", "Knee ROM", "Ankle ROM",
  // Posture Correction
  "Chin Tucks", "Scapular Retraction", "Wall Angels", "Thoracic Extension", "Seated Posture Training",
  // Breathing
  "Diaphragmatic Breathing", "Pursed-Lip Breathing", "Deep Breathing Exercise", "Controlled Coughing", "Box Breathing"
])

// Helper to define landmark configs for Mode A
const getLandmarkConfig = (type: string, primaryJoint: string, landmarks: [number, number, number], range: [number, number], start: number, top: number) => ({
  exercise_id: type,
  primary_joint: primaryJoint,
  landmarks_used: landmarks,
  angle_range_valid: range,
  rep_start_angle: start,
  rep_top_angle: top,
  min_rep_duration_ms: 800,
  max_rep_duration_ms: 8000,
})

const seedData: Record<string, ExerciseSeedData> = {}

function addExercise(name: string, category: string, mode: string, short: string, full: string, lm?: any, hold?: number) {
  if (seedData[name]) {
    if (!seedData[name].categories.includes(category)) {
      seedData[name].categories.push(category)
    }
  } else {
    seedData[name] = {
      name,
      categories: [category],
      trackingMode: mode,
      instructionsShort: short,
      instructionsFull: full,
      landmarkConfig: lm,
      targetHoldSeconds: hold,
      isActive: ACTIVE_EXERCISES.has(name)
    }
  }
}

// 1. Neck Exercises
addExercise("Chin Tucks", "Neck Exercises", "A", "Improves forward head posture.", "Sit or stand up straight. Without tilting your head, pull your chin straight back as if making a double chin.", getLandmarkConfig("chin_tuck", "neck", [8, 12, 24], [0, 30], 5, 20))
addExercise("Neck Rotation", "Neck Exercises", "A", "Improves neck turning range.", "Turn your head slowly to one side as far as comfortable, then return to center.", getLandmarkConfig("neck_rotation", "neck", [12, 0, 11], [0, 90], 15, 60))
addExercise("Neck Side Bending", "Neck Exercises", "A", "Stretches the side of the neck.", "Tilt your ear toward your shoulder without lifting the shoulder.", getLandmarkConfig("neck_side_bend", "neck", [0, 11, 12], [0, 45], 5, 30))
addExercise("Neck Flexion", "Neck Exercises", "A", "Stretches the back of the neck.", "Slowly drop your chin toward your chest.", getLandmarkConfig("neck_flexion", "neck", [8, 12, 24], [0, 90], 10, 45))
addExercise("Neck Extension", "Neck Exercises", "A", "Improves neck extension.", "Slowly tilt your head back to look at the ceiling.", getLandmarkConfig("neck_extension", "neck", [8, 12, 24], [0, 90], 10, 45))
addExercise("Isometric Neck Flexion", "Neck Exercises", "B", "Strengthens neck flexors.", "Press your forehead into your hand without moving your head.", getLandmarkConfig("isometric_neck_flexion", "neck", [8, 12, 24], [0, 45], 5, 10), 10)
addExercise("Isometric Neck Extension", "Neck Exercises", "B", "Strengthens neck extensors.", "Press the back of your head into your hand without moving.", getLandmarkConfig("isometric_neck_extension", "neck", [8, 12, 24], [0, 45], 5, 10), 10)
addExercise("Upper Trapezius Stretch", "Neck Exercises", "B", "Relieves upper back/neck tension.", "Gently pull your head to the side using one hand.", getLandmarkConfig("upper_trap_stretch", "neck", [0, 11, 12], [0, 45], 5, 20), 30)
addExercise("Levator Scapulae Stretch", "Neck Exercises", "B", "Stretches the back of the neck.", "Turn your head slightly and look down toward your armpit.", getLandmarkConfig("levator_stretch", "neck", [8, 12, 24], [0, 90], 5, 30), 30)
addExercise("Cervical Retraction", "Neck Exercises", "A", "Corrects cervical alignment.", "Glide your head backward, keeping your eyes level.", getLandmarkConfig("cervical_retraction", "neck", [8, 12, 24], [0, 30], 5, 20))

// 2. Shoulder Exercises
addExercise("Pendulum Exercise", "Shoulder Exercises", "A", "Gently mobilizes the shoulder joint.", "Lean forward and let your arm hang loose. Gently swing it in small circles.", getLandmarkConfig("pendulum", "shoulder", [12, 14, 16], [0, 45], 5, 20))
addExercise("Shoulder Flexion", "Shoulder Exercises", "A", "Improves forward reaching.", "Raise your arm straight out in front of you and up toward the ceiling.", getLandmarkConfig("shoulder_flexion", "shoulder", [24, 12, 14], [0, 180], 20, 140))
addExercise("Shoulder Abduction", "Shoulder Exercises", "A", "Improves lifting to the side.", "Raise your arm straight out to the side.", getLandmarkConfig("shoulder_abduction", "shoulder", [24, 12, 14], [0, 180], 25, 90))
addExercise("Shoulder Extension", "Shoulder Exercises", "A", "Improves backward reaching.", "Keep your arm straight and push it backward behind your body.", getLandmarkConfig("shoulder_extension", "shoulder", [24, 12, 14], [0, 90], 10, 45))
addExercise("Internal Rotation", "Shoulder Exercises", "A", "Strengthens rotator cuff.", "Keep your elbow at your side bent at 90 degrees, and bring your hand inward across your stomach.", getLandmarkConfig("internal_rotation", "shoulder", [12, 14, 16], [0, 90], 10, 60))
addExercise("External Rotation", "Shoulder Exercises", "A", "Strengthens external rotators.", "Keep your elbow at your side bent at 90 degrees, and rotate your hand outward away from your stomach.", getLandmarkConfig("external_rotation", "shoulder", [12, 14, 16], [0, 90], 10, 45))
addExercise("Wall Crawls", "Shoulder Exercises", "A", "Assists in raising the arm.", "Face a wall and use your fingers to 'crawl' up the wall, raising your arm.", getLandmarkConfig("wall_crawls", "shoulder", [24, 12, 16], [0, 180], 30, 120))
addExercise("Scapular Retraction", "Shoulder Exercises", "A", "Improves shoulder blade posture.", "Squeeze your shoulder blades together as if holding a pencil between them.", getLandmarkConfig("scapular_retraction", "shoulder", [11, 12, 24], [0, 45], 5, 20))
addExercise("Shoulder Shrugs", "Shoulder Exercises", "A", "Strengthens upper traps.", "Raise your shoulders up toward your ears, hold, and release.", getLandmarkConfig("shoulder_shrugs", "shoulder", [8, 12, 24], [0, 90], 10, 30))
addExercise("Cross-Body Stretch", "Shoulder Exercises", "B", "Stretches the back of the shoulder.", "Pull one arm across your chest using the other arm.", getLandmarkConfig("cross_body_stretch", "shoulder", [12, 14, 16], [0, 180], 10, 130), 30)
addExercise("Finger Ladder Exercise", "Shoulder Exercises", "C", "Improves fine motor and shoulder elevation.", "Use a finger ladder to slowly walk fingers upward.", undefined, undefined)

// 3. Back Exercises
addExercise("Pelvic Tilt", "Back Exercises", "A", "Strengthens core and lower back.", "Lie on your back with knees bent. Flatten your lower back against the floor.", getLandmarkConfig("pelvic_tilt", "hip", [12, 24, 26], [90, 180], 170, 150))
addExercise("Cat-Camel Stretch", "Back Exercises", "A", "Mobilizes the entire spine.", "On all fours, arch your back up like a cat, then let it sag toward the floor.", getLandmarkConfig("cat_camel", "back", [12, 24, 26], [90, 180], 110, 140))
addExercise("Bird Dog", "Back Exercises", "A", "Improves core stability.", "On all fours, extend one arm forward and the opposite leg backward.", getLandmarkConfig("bird_dog", "back", [12, 24, 26], [90, 180], 120, 170))
addExercise("Bridge Exercise", "Back Exercises", "A", "Strengthens glutes and lower back.", "Lie on your back, knees bent. Lift your hips until your body forms a straight line from knees to shoulders.", getLandmarkConfig("bridge", "hip", [12, 24, 26], [90, 180], 130, 170))
addExercise("Prone Press-Up", "Back Exercises", "A", "Extends the lumbar spine.", "Lie on your stomach and push up with your arms, keeping hips on the floor.", getLandmarkConfig("prone_press", "back", [12, 24, 26], [90, 180], 170, 140))
addExercise("Child's Pose Stretch", "Back Exercises", "B", "Stretches the lower back.", "Kneel and sit back on your heels while reaching arms forward on the floor.", getLandmarkConfig("child_pose", "back", [12, 24, 26], [0, 90], 90, 30), 30)
addExercise("Knee-to-Chest Stretch", "Back Exercises", "B", "Relieves lower back tension.", "Lie on your back and pull one knee toward your chest.", getLandmarkConfig("knee_to_chest", "hip", [12, 24, 26], [0, 180], 170, 90), 30)
addExercise("Lumbar Rotation Stretch", "Back Exercises", "A", "Improves lower back mobility.", "Lie on your back, bend knees, and let them fall to one side.", getLandmarkConfig("lumbar_rotation", "back", [11, 23, 24], [0, 90], 10, 45))
addExercise("Superman Exercise", "Back Exercises", "A", "Strengthens lower back muscles.", "Lie on your stomach and lift arms and legs off the floor simultaneously.", getLandmarkConfig("superman", "back", [12, 24, 26], [150, 180], 175, 160))
addExercise("Seated Trunk Rotation", "Back Exercises", "A", "Improves spinal mobility.", "Sit tall and twist your torso to one side, using a chair for leverage.", getLandmarkConfig("seated_rotation", "back", [11, 23, 24], [0, 90], 10, 45))

// 4. Hip Exercises
addExercise("Straight Leg Raise", "Hip Exercises", "A", "Strengthens hip flexors and quads.", "Lie on your back and lift one leg straight up while keeping the other bent.", getLandmarkConfig("straight_leg_raise", "hip", [12, 24, 26], [90, 180], 170, 130))
addExercise("Hip Abduction", "Hip Exercises", "A", "Strengthens outer hip muscles.", "Stand or lie on your side and lift the top leg straight up.", getLandmarkConfig("hip_abduction", "hip", [23, 24, 26], [120, 180], 175, 145))
addExercise("Hip Adduction", "Hip Exercises", "A", "Strengthens inner thigh.", "Squeeze a ball between your knees, or lift your bottom leg while lying on your side.", getLandmarkConfig("hip_adduction", "hip", [23, 24, 26], [120, 180], 170, 150))
addExercise("Hip Extension", "Hip Exercises", "A", "Strengthens glutes.", "Stand straight and extend one leg backward without bending the knee.", getLandmarkConfig("hip_extension", "hip", [12, 24, 26], [150, 180], 175, 160))
addExercise("Hip Flexion", "Hip Exercises", "A", "Improves hip mobility.", "Stand and lift your knee toward your chest.", getLandmarkConfig("hip_flexion", "hip", [12, 24, 26], [90, 180], 170, 110))
addExercise("Clamshell Exercise", "Hip Exercises", "A", "Targets the gluteus medius.", "Lie on your side with knees bent. Keep feet together and lift the top knee.", getLandmarkConfig("clamshell", "hip", [23, 24, 26], [90, 180], 170, 130))
addExercise("Glute Bridge", "Hip Exercises", "A", "Strengthens the glutes and core.", "Lie on back, bend knees, and lift hips toward the ceiling.", getLandmarkConfig("glute_bridge", "hip", [12, 24, 26], [90, 180], 130, 170))
addExercise("Standing Hip March", "Hip Exercises", "A", "Improves balance and hip flexion.", "Stand and march in place, lifting knees high.", getLandmarkConfig("hip_march", "hip", [12, 24, 26], [90, 180], 170, 110))
addExercise("Side Leg Raise", "Hip Exercises", "A", "Strengthens hip abductors.", "Lie on your side and lift your top leg straight up to the ceiling.", getLandmarkConfig("side_leg_raise", "hip", [23, 24, 26], [90, 180], 175, 145))
addExercise("Hip Circles", "Hip Exercises", "A", "Mobilizes the hip joint.", "Stand on one leg and make small circles with the other leg.", getLandmarkConfig("hip_circles", "hip", [23, 24, 26], [150, 180], 175, 160))

// 5. Knee Exercises
addExercise("Quad Sets", "Knee Exercises", "B", "Activates thigh muscles.", "Sit with your leg straight and push the back of your knee into the floor.", getLandmarkConfig("quad_sets", "knee", [24, 26, 28], [150, 180], 160, 175), 10)
addExercise("Heel Slides", "Knee Exercises", "A", "Improves knee bending.", "Lie on your back and slide your heel toward your buttocks, bending your knee.", getLandmarkConfig("heel_slides", "knee", [24, 26, 28], [30, 180], 160, 90))
addExercise("Short Arc Quad", "Knee Exercises", "A", "Strengthens quads safely.", "Place a rolled towel under your knee and straighten the lower leg.", getLandmarkConfig("short_arc_quad", "knee", [24, 26, 28], [120, 180], 140, 175))
addExercise("Long Arc Quad", "Knee Exercises", "A", "Full range quad strengthening.", "Sit in a chair and straighten your knee fully.", getLandmarkConfig("long_arc_quad", "knee", [24, 26, 28], [90, 180], 100, 170))
addExercise("Hamstring Curl", "Knee Exercises", "A", "Strengthens back of the thigh.", "Stand or lie on your stomach and bend your knee to bring your heel toward your glutes.", getLandmarkConfig("hamstring_curl", "knee", [24, 26, 28], [30, 180], 170, 90))
addExercise("Wall Slides", "Knee Exercises", "A", "Strengthens legs and glutes.", "Lean against a wall and slide down into a mini squat position, then back up.", getLandmarkConfig("wall_slides", "knee", [24, 26, 28], [90, 180], 170, 110))
addExercise("Mini Squats", "Knee Exercises", "A", "Builds functional leg strength.", "Stand with feet shoulder-width apart and bend knees slightly as if sitting in a chair.", getLandmarkConfig("mini_squat", "knee", [24, 26, 28], [90, 180], 170, 120))
addExercise("Step-Ups", "Knee Exercises", "A", "Improves stair climbing strength.", "Step up onto a small stool or stair with one foot, then step back down.", getLandmarkConfig("step_ups", "knee", [24, 26, 28], [90, 180], 170, 120))
addExercise("Terminal Knee Extension", "Knee Exercises", "A", "Focuses on the final degrees of straightening.", "Use a resistance band behind your knee and straighten your leg fully.", getLandmarkConfig("terminal_knee_ext", "knee", [24, 26, 28], [120, 180], 150, 178))
addExercise("Sit-to-Stand Exercise", "Knee Exercises", "A", "Essential functional movement.", "Stand up from a chair without using your hands, then sit back down slowly.", getLandmarkConfig("sit_to_stand", "knee", [24, 26, 28], [90, 180], 100, 170))
addExercise("Knee Flexion", "Knee Exercises", "A", "Bending the knee joint.", "Bend your knee as far as you can.", getLandmarkConfig("knee_flexion", "knee", [24, 26, 28], [0, 180], 160, 90))

// 6. Ankle & Foot Exercises
addExercise("Ankle Pumps", "Ankle & Foot Exercises", "A", "Improves circulation.", "Pump your ankles up and down as if pressing a gas pedal.", getLandmarkConfig("ankle_pumps", "ankle", [26, 28, 32], [90, 180], 130, 160))
addExercise("Ankle Circles", "Ankle & Foot Exercises", "A", "Improves ankle mobility.", "Draw circles in the air with your toes.", getLandmarkConfig("ankle_circles", "ankle", [26, 28, 32], [90, 180], 130, 160))
addExercise("Heel Raises", "Ankle & Foot Exercises", "A", "Strengthens calf muscles.", "Stand holding a counter and rise up onto your toes.", getLandmarkConfig("heel_raises", "ankle", [26, 28, 32], [90, 180], 100, 140))
addExercise("Toe Raises", "Ankle & Foot Exercises", "A", "Strengthens front of the lower leg.", "Stand and lift your toes off the floor while keeping your heels down.", getLandmarkConfig("toe_raises", "ankle", [26, 28, 32], [90, 180], 140, 110))
addExercise("Toe Curls", "Ankle & Foot Exercises", "C", "Strengthens foot muscles.", "Use your toes to scrunch up a towel placed on the floor.", undefined, undefined)
addExercise("Towel Scrunches", "Ankle & Foot Exercises", "C", "Builds arch strength.", "Use your toes to pull a towel toward you.", undefined, undefined)
addExercise("Heel Walking", "Ankle & Foot Exercises", "D", "Improves ankle control.", "Walk across the room on your heels.", undefined, undefined)
addExercise("Toe Walking", "Ankle & Foot Exercises", "D", "Strengthens calves.", "Walk across the room on your tiptoes.", undefined, undefined)
addExercise("Calf Stretch", "Ankle & Foot Exercises", "B", "Stretches the back of the lower leg.", "Stand facing a wall, put one foot back, keep it straight, and lean forward.", getLandmarkConfig("calf_stretch", "ankle", [26, 28, 32], [0, 180], 130, 110), 30)
addExercise("Single-Leg Stand", "Ankle & Foot Exercises", "B", "Improves stability.", "Stand on one leg for as long as possible.", getLandmarkConfig("single_leg_stand", "knee", [24, 26, 28], [0, 180], 170, 90), 30)

// 7. Wrist & Hand Exercises
addExercise("Wrist Flexion", "Wrist & Hand Exercises", "C", "Strengthens wrist flexors.", "Hold a small weight, palm up, and curl your wrist upward.", undefined, undefined)
addExercise("Wrist Extension", "Wrist & Hand Exercises", "C", "Strengthens wrist extensors.", "Hold a small weight, palm down, and lift your knuckles upward.", undefined, undefined)
addExercise("Wrist Pronation", "Wrist & Hand Exercises", "C", "Improves forearm rotation.", "Turn your palm to face down.", undefined, undefined)
addExercise("Wrist Supination", "Wrist & Hand Exercises", "C", "Improves forearm rotation.", "Turn your palm to face up.", undefined, undefined)
addExercise("Finger Flexion", "Wrist & Hand Exercises", "C", "Improves grip.", "Make a tight fist.", undefined, undefined)
addExercise("Finger Extension", "Wrist & Hand Exercises", "C", "Improves hand opening.", "Straighten all fingers fully.", undefined, undefined)
addExercise("Thumb Opposition", "Wrist & Hand Exercises", "C", "Improves fine motor skills.", "Touch your thumb to the tip of each finger.", undefined, undefined)
addExercise("Grip Strengthening", "Wrist & Hand Exercises", "C", "Builds hand strength.", "Squeeze a stress ball or putty.", undefined, undefined)
addExercise("Tendon Gliding", "Wrist & Hand Exercises", "C", "Promotes smooth tendon movement.", "Move hand through straight, hook, fist, and tabletop positions.", undefined, undefined)
addExercise("Finger Spreading", "Wrist & Hand Exercises", "C", "Strengthens hand muscles.", "Spread your fingers wide apart.", undefined, undefined)

// 8. Balance & Coordination
addExercise("Single-Leg Stand", "Balance & Coordination Exercises", "B", "Improves stability.", "Stand on one leg without holding onto anything.", undefined, 30)
addExercise("Tandem Standing", "Balance & Coordination Exercises", "B", "Challenges narrow base of support.", "Stand with one foot directly in front of the other (heel-to-toe).", undefined, 30)
addExercise("Tandem Walking", "Balance & Coordination Exercises", "D", "Improves dynamic balance.", "Walk placing the heel of one foot directly in front of the toes of the other.", undefined, undefined)
addExercise("Heel-to-Toe Walk", "Balance & Coordination Exercises", "D", "Improves dynamic balance.", "Walk placing the heel of one foot directly in front of the toes of the other.", undefined, undefined)
addExercise("Weight Shifting", "Balance & Coordination Exercises", "A", "Trains lateral stability.", "Shift your body weight gently from one leg to the other.", getLandmarkConfig("weight_shifting", "hip", [23, 24, 26], [150, 180], 175, 165))
addExercise("Side Stepping", "Balance & Coordination Exercises", "D", "Improves lateral movement.", "Step sideways across the room.", undefined, undefined)
addExercise("Marching in Place", "Balance & Coordination Exercises", "A", "Improves balance and hip flexion.", "Stand and march in place, lifting knees high.", getLandmarkConfig("marching_in_place", "hip", [12, 24, 26], [90, 180], 170, 110))
addExercise("Reaching Exercises", "Balance & Coordination Exercises", "A", "Challenges limits of stability.", "Reach forward, sideways, or diagonally while maintaining balance.", getLandmarkConfig("reaching", "shoulder", [24, 12, 16], [0, 180], 20, 120))
addExercise("Obstacle Walking", "Balance & Coordination Exercises", "D", "Improves functional mobility.", "Walk and step over small obstacles on the floor.", undefined, undefined)
addExercise("Balance Board Training", "Balance & Coordination Exercises", "D", "Advanced balance challenge.", "Stand on a wobble board and maintain balance.", undefined, undefined)

// 9. Walking (Gait) Training
addExercise("Assisted Walking", "Walking (Gait) Training", "D", "Early mobilization.", "Walk with the assistance of a physical therapist or parallel bars.", undefined, undefined)
addExercise("Heel Strike Training", "Walking (Gait) Training", "D", "Normalizes gait pattern.", "Focus on landing on the heel first when taking a step.", undefined, undefined)
addExercise("Toe-Off Training", "Walking (Gait) Training", "D", "Normalizes gait pattern.", "Focus on pushing off with the toes at the end of a step.", undefined, undefined)
addExercise("Step Length Training", "Walking (Gait) Training", "D", "Normalizes gait pattern.", "Practice taking equal and appropriately sized steps.", undefined, undefined)
addExercise("Stair Climbing", "Walking (Gait) Training", "D", "Functional mobility.", "Practice walking up and down stairs safely.", undefined, undefined)
addExercise("Side Walking", "Walking (Gait) Training", "D", "Improves lateral stability.", "Step sideways across the room.", undefined, undefined)
addExercise("Backward Walking", "Walking (Gait) Training", "D", "Improves proprioception.", "Walk backward carefully in a clear area.", undefined, undefined)
addExercise("Sit-to-Stand Practice", "Walking (Gait) Training", "A", "Essential functional movement.", "Practice standing up from a chair and sitting back down.", getLandmarkConfig("sit_to_stand_gait", "knee", [24, 26, 28], [90, 180], 100, 170))
addExercise("Walking with Walker", "Walking (Gait) Training", "D", "Safe mobility.", "Practice walking using a standard or rolling walker.", undefined, undefined)
addExercise("Walking with Cane", "Walking (Gait) Training", "D", "Safe mobility.", "Practice walking using a single-point or quad cane.", undefined, undefined)

// 10. Stretching
addExercise("Hamstring Stretch", "Stretching Exercises", "B", "Increases hamstring flexibility.", "Sit on floor, keep one leg straight, and reach toward toes.", undefined, 30)
addExercise("Quadriceps Stretch", "Stretching Exercises", "B", "Increases thigh flexibility.", "Stand and pull your heel toward your glutes.", undefined, 30)
// Calf stretch already added, just append category
addExercise("Calf Stretch", "Stretching Exercises", "B", "Stretches the back of the lower leg.", "Stand facing a wall, put one foot back, keep it straight, and lean forward.", undefined, 30)
addExercise("Hip Flexor Stretch", "Stretching Exercises", "B", "Stretches front of the hip.", "Kneel on one knee and push your hips forward.", undefined, 30)
addExercise("Groin Stretch", "Stretching Exercises", "B", "Stretches inner thighs.", "Sit with soles of feet together and gently push knees down.", undefined, 30)
addExercise("Chest Stretch", "Stretching Exercises", "B", "Opens the chest and shoulders.", "Stand in a doorway and lean forward with arms on the doorframe.", undefined, 30)
addExercise("Shoulder Stretch", "Stretching Exercises", "B", "Increases shoulder flexibility.", "Pull one arm across your chest using the other arm.", undefined, 30)
addExercise("Neck Stretch", "Stretching Exercises", "B", "Relieves neck tension.", "Gently tilt your head to the side, stretching the opposite side.", undefined, 30)
addExercise("Lower Back Stretch", "Stretching Exercises", "B", "Relieves lower back tension.", "Lie on back and pull both knees to chest.", undefined, 30)
addExercise("IT Band Stretch", "Stretching Exercises", "B", "Stretches outside of the thigh.", "Cross one leg behind the other and lean away from the back leg.", undefined, 30)

// 11. Strengthening
addExercise("Squats", "Strengthening Exercises", "A", "Builds total leg strength.", "Stand with feet shoulder-width apart, bend knees and lower hips as if sitting in a chair.", getLandmarkConfig("squat", "knee", [24, 26, 28], [90, 180], 170, 100))
addExercise("Lunges", "Strengthening Exercises", "A", "Builds leg strength and balance.", "Step forward and lower your hips until both knees are bent at a 90-degree angle.", getLandmarkConfig("lunge", "knee", [24, 26, 28], [90, 180], 170, 100))
addExercise("Wall Push-Ups", "Strengthening Exercises", "A", "Strengthens chest and arms safely.", "Stand facing a wall, place hands on wall, and do a push-up motion.", getLandmarkConfig("wall_pushup", "shoulder", [12, 14, 16], [45, 180], 170, 90))
addExercise("Heel Raises", "Strengthening Exercises", "A", "Strengthens calf muscles.", "Stand holding a counter and rise up onto your toes.", getLandmarkConfig("heel_raises", "ankle", [26, 28, 32], [90, 180], 100, 140))
addExercise("Bridge Exercise", "Strengthening Exercises", "A", "Strengthens glutes and lower back.", "Lie on your back, knees bent. Lift your hips until your body forms a straight line from knees to shoulders.", getLandmarkConfig("bridge", "hip", [12, 24, 26], [90, 180], 130, 170))
addExercise("Step-Ups", "Strengthening Exercises", "A", "Improves stair climbing strength.", "Step up onto a small stool or stair with one foot, then step back down.", getLandmarkConfig("step_ups", "knee", [24, 26, 28], [90, 180], 170, 120))
addExercise("Resistance Band Row", "Strengthening Exercises", "A", "Strengthens back muscles.", "Anchor a resistance band, hold handles, and pull elbows back.", getLandmarkConfig("band_row", "shoulder", [12, 14, 16], [45, 180], 170, 90))
addExercise("Bicep Curl", "Strengthening Exercises", "A", "Strengthens front of the arm.", "Hold a weight and bend your elbow to bring the weight toward your shoulder.", getLandmarkConfig("bicep_curl", "shoulder", [12, 14, 16], [30, 180], 170, 60))
addExercise("Leg Press", "Strengthening Exercises", "D", "Builds leg strength on a machine.", "Use a leg press machine to push weight away with your legs.", undefined, undefined)
addExercise("Side Leg Raise", "Strengthening Exercises", "A", "Strengthens hip abductors.", "Lie on your side and lift your top leg straight up to the ceiling.", getLandmarkConfig("side_leg_raise", "hip", [23, 24, 26], [90, 180], 175, 145))

// 12. Range of Motion (ROM)
addExercise("Active ROM", "Range of Motion (ROM) Exercises", "A", "General active movement.", "Move the joint through its full available range of motion unassisted.", getLandmarkConfig("active_rom", "shoulder", [24, 12, 14], [0, 180], 20, 150))
addExercise("Passive ROM", "Range of Motion (ROM) Exercises", "D", "Movement assisted by therapist.", "Therapist moves the joint without your active effort.", undefined, undefined)
addExercise("Assisted ROM", "Range of Motion (ROM) Exercises", "D", "Movement with some assistance.", "Use your other arm or a tool to help move the joint.", undefined, undefined)
addExercise("Shoulder ROM", "Range of Motion (ROM) Exercises", "A", "Shoulder mobility.", "Move your shoulder through all possible directions.", getLandmarkConfig("shoulder_rom", "shoulder", [24, 12, 14], [0, 180], 20, 150))
addExercise("Elbow ROM", "Range of Motion (ROM) Exercises", "A", "Elbow mobility.", "Bend and straighten your elbow fully.", getLandmarkConfig("elbow_rom", "shoulder", [12, 14, 16], [30, 180], 170, 45))
addExercise("Wrist ROM", "Range of Motion (ROM) Exercises", "C", "Wrist mobility.", "Move your wrist up, down, and side to side.", undefined, undefined)
addExercise("Hip ROM", "Range of Motion (ROM) Exercises", "A", "Hip mobility.", "Move your hip through its full range of motion.", getLandmarkConfig("hip_rom", "hip", [12, 24, 26], [90, 180], 170, 100))
addExercise("Knee ROM", "Range of Motion (ROM) Exercises", "A", "Knee mobility.", "Bend and straighten your knee fully.", getLandmarkConfig("knee_rom", "knee", [24, 26, 28], [30, 180], 170, 60))
addExercise("Ankle ROM", "Range of Motion (ROM) Exercises", "A", "Ankle mobility.", "Pump your ankle and roll it in circles.", getLandmarkConfig("ankle_rom", "ankle", [26, 28, 32], [90, 180], 130, 160))
addExercise("Finger ROM", "Range of Motion (ROM) Exercises", "C", "Finger mobility.", "Make a fist and then fully straighten all fingers.", undefined, undefined)

// 13. Posture Correction
addExercise("Chin Tucks", "Posture Correction Exercises", "A", "Improves forward head posture.", "Sit or stand up straight. Without tilting your head, pull your chin straight back as if making a double chin.", getLandmarkConfig("chin_tuck", "neck", [8, 12, 24], [0, 30], 5, 20))
addExercise("Scapular Retraction", "Posture Correction Exercises", "A", "Improves shoulder blade posture.", "Squeeze your shoulder blades together as if holding a pencil between them.", getLandmarkConfig("scapular_retraction", "shoulder", [11, 12, 24], [0, 45], 5, 20))
addExercise("Wall Angels", "Posture Correction Exercises", "A", "Strengthens postural muscles.", "Stand against a wall and slide your arms up and down like making a snow angel.", getLandmarkConfig("wall_angels", "shoulder", [24, 12, 14], [0, 180], 30, 150))
addExercise("Shoulder Blade Squeeze", "Posture Correction Exercises", "A", "Improves upper back posture.", "Squeeze your shoulder blades tightly together.", getLandmarkConfig("shoulder_blade_squeeze", "shoulder", [11, 12, 24], [0, 45], 5, 20))
addExercise("Thoracic Extension", "Posture Correction Exercises", "A", "Improves mid-back mobility.", "Extend your mid-back over a foam roller or chair back.", getLandmarkConfig("thoracic_ext", "back", [8, 12, 24], [0, 45], 5, 30))
addExercise("Doorway Chest Stretch", "Posture Correction Exercises", "B", "Opens the chest.", "Stand in a doorway and lean forward with arms on the doorframe.", undefined, 30)
addExercise("Pelvic Tilt", "Posture Correction Exercises", "A", "Corrects pelvic alignment.", "Lie on your back with knees bent. Flatten your lower back against the floor.", getLandmarkConfig("pelvic_tilt", "hip", [12, 24, 26], [90, 180], 170, 150))
addExercise("Core Bracing", "Posture Correction Exercises", "B", "Stabilizes the spine.", "Tighten your abdominal muscles as if preparing for a punch.", undefined, 15)
addExercise("Standing Alignment Practice", "Posture Correction Exercises", "B", "Trains ideal standing posture.", "Stand against a wall, ensuring heels, hips, shoulders, and head touch the wall.", undefined, 30)
addExercise("Seated Posture Training", "Posture Correction Exercises", "B", "Trains ideal sitting posture.", "Sit with feet flat, hips at 90 degrees, and a small curve in the lower back.", undefined, 30)

// 14. Breathing Exercises
addExercise("Diaphragmatic Breathing", "Breathing Exercises", "D", "Belly breathing for relaxation.", "Breathe in deeply so your belly rises, then exhale slowly.", undefined, undefined)
addExercise("Pursed-Lip Breathing", "Breathing Exercises", "D", "Improves ventilation.", "Breathe in through your nose, exhale slowly through pursed lips.", undefined, undefined)
addExercise("Deep Breathing Exercise", "Breathing Exercises", "D", "Expands lung capacity.", "Take slow, deep breaths, filling your lungs completely.", undefined, undefined)
addExercise("Segmental Breathing", "Breathing Exercises", "D", "Targets specific lung areas.", "Focus your breathing into the therapist's hands placed on your ribs.", undefined, undefined)
addExercise("Thoracic Expansion Exercise", "Breathing Exercises", "D", "Mobilizes the rib cage.", "Inhale deeply while raising your arms, then exhale while lowering.", undefined, undefined)
addExercise("Incentive Spirometry", "Breathing Exercises", "D", "Encourages deep inhalation.", "Use an incentive spirometer device to practice taking deep breaths.", undefined, undefined)
addExercise("Huff Cough Technique", "Breathing Exercises", "D", "Helps clear secretions.", "Take a deep breath and exhale forcefully saying 'huff'.", undefined, undefined)
addExercise("Controlled Coughing", "Breathing Exercises", "D", "Clears airways effectively.", "Take a slow deep breath, hold it briefly, and cough twice forcefully.", undefined, undefined)
addExercise("Box Breathing", "Breathing Exercises", "D", "Relaxes the nervous system.", "Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s.", undefined, undefined)
addExercise("Inspiratory Muscle Training", "Breathing Exercises", "D", "Strengthens breathing muscles.", "Breathe in against resistance using a specialized device.", undefined, undefined)

async function main() {
  console.log("Seeding exercises...")
  
  for (const key of Object.keys(seedData)) {
    const data = seedData[key]
    
    await prisma.exercise.upsert({
      where: { id: key }, // Wait, id is a cuid, we can't search by it reliably if not set. We must search by name.
      update: {
        categories: data.categories,
        trackingMode: data.trackingMode,
        instructionsShort: data.instructionsShort,
        instructionsFull: data.instructionsFull,
        targetHoldSeconds: data.targetHoldSeconds,
        landmarkConfig: data.landmarkConfig || undefined
      },
      create: {
        name: data.name,
        description: data.instructionsShort,
        categories: data.categories,
        trackingMode: data.trackingMode,
        instructionsShort: data.instructionsShort,
        instructionsFull: data.instructionsFull,
        targetHoldSeconds: data.targetHoldSeconds,
        landmarkConfig: data.landmarkConfig || undefined
      }
    })
  }

  console.log(`Seeded ${Object.keys(seedData).length} unique exercises!`)
}

// We need to use prisma.exercise.findFirst to find by name, then update, or create if missing, since name is not @unique.
async function safeSeed() {
  console.log("Safe seeding exercises...")
  let count = 0
  for (const key of Object.keys(seedData)) {
    const data = seedData[key]
    const existing = await prisma.exercise.findFirst({ where: { name: data.name } })
    
    if (existing) {
      await prisma.exercise.update({
        where: { id: existing.id },
        data: {
          categories: data.categories,
          trackingMode: data.trackingMode,
          instructionsShort: data.instructionsShort,
          instructionsFull: data.instructionsFull,
          targetHoldSeconds: data.targetHoldSeconds,
          landmarkConfig: data.landmarkConfig || undefined,
          targetROM: data.landmarkConfig?.rep_top_angle || existing.targetROM,
          isActive: data.isActive
        }
      })
    } else {
      await prisma.exercise.create({
        data: {
          name: data.name,
          description: data.instructionsShort,
          categories: data.categories,
          trackingMode: data.trackingMode,
          instructionsShort: data.instructionsShort,
          instructionsFull: data.instructionsFull,
          targetHoldSeconds: data.targetHoldSeconds,
          landmarkConfig: data.landmarkConfig || undefined,
          targetROM: data.landmarkConfig?.rep_top_angle || null,
          isActive: data.isActive
        }
      })
    }
    count++
  }
  console.log(`Seeded ${count} exercises successfully!`)
}

safeSeed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
