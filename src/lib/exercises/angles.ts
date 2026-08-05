export interface Point3D {
  x: number
  y: number
  z: number
  visibility?: number
}

/**
 * Calculates the angle (in degrees) between three 3D points.
 * `b` is the vertex of the angle.
 */
export function calculateAngle3D(a: Point3D, b: Point3D, c: Point3D): number {
  // Vector BA
  const ba = {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }

  // Vector BC
  const bc = {
    x: c.x - b.x,
    y: c.y - b.y,
    z: c.z - b.z,
  }

  // Dot product
  const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z

  // Magnitudes
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z)
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z)

  if (magBA === 0 || magBC === 0) return 0

  let cosTheta = dotProduct / (magBA * magBC)
  
  // Clamp due to floating point inaccuracies
  cosTheta = Math.max(-1, Math.min(1, cosTheta))

  const angleRad = Math.acos(cosTheta)
  return angleRad * (180 / Math.PI)
}

/**
 * Calculates a 2D angle on the X-Y plane. Useful if Z is highly unstable.
 */
export function calculateAngle2D(a: Point3D, b: Point3D, c: Point3D): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * (180.0 / Math.PI))
  if (angle > 180.0) {
    angle = 360.0 - angle
  }
  return angle
}
