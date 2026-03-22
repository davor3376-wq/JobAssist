/**
 * Generates a mailto: link pre-filled with a job application subject and cover letter body.
 * Handles German characters (ä, ö, ü, ß) and line breaks correctly.
 *
 * @param {object} job     - Job object with at least { title, company }
 * @param {string} body    - Cover letter / motivation text
 * @param {string} userName     - Applicant's display name
 * @param {string} [contactEmail] - Optional recipient address (contact_email from job result)
 * @returns {string} mailto: URL
 */
export function generateMailtoLink(job, body, userName, contactEmail = "") {
  const subject = `Bewerbung als ${job.title || job.role || "diese Stelle"} - ${userName}`;

  // Normalise line endings to CRLF — required by RFC 2822 for email body
  const normalisedBody = body.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");

  const to = contactEmail ? encodeURIComponent(contactEmail) : "";
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(normalisedBody)}`;
}
