/**
 * Course, semester and cumulative calculations. The rules live in
 * ./academicRules (shared byte-for-byte between web and Android); this module
 * keeps the established import path for existing callers.
 *
 * - computeCourseMetrics: grade/PI for one course; carries isAR/pending through.
 * - computeSemesterGPA: skips awaiting-result (isAR) and pending rows.
 * - computeCumulativeCGPA: weights each semester by its graded credit load.
 */
export { computeCourseMetrics, computeSemesterGPA, computeCumulativeCGPA } from './academicRules';
