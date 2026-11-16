/**
 * Parent-Student Verification & Multi-Child Linking Utility
 * 
 * Verifies and associates student(s) with a parent user based on:
 * 1. Explicit database relationships (parent_student table or parent.student_ids)
 * 2. Parent full name matching Father's name, Mother's name, or Guardian's name
 * 3. Parent contact phone matching Father's phone, Mother's phone, or Emergency phone
 * 4. Parent email matching parent contact email
 * 5. Parent address matching student home address
 */

/**
 * Normalizes text: trims, lowercases, removes common honorifics (Mr., Mrs., Shri, Smt., Dr.)
 */
export const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/^(mr\.|mrs\.|ms\.|dr\.|shri|smt\.|prof\.)\s+/i, '')
    .replace(/\s+/g, ' ');
};

/**
 * Normalizes phone numbers: extracts the last 10 significant digits
 */
export const normalizePhone = (phone) => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  // Extract last 10 digits to ignore country code prefixes (+91, 0, etc.)
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

/**
 * Checks if two names match with high or partial confidence
 */
export const isNameMatch = (nameA, nameB) => {
  const normA = normalizeText(nameA);
  const normB = normalizeText(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  // Substring or token overlap (e.g. "Suresh Sharma" and "Mr. Suresh Sharma")
  const tokensA = normA.split(' ').filter(Boolean);
  const tokensB = normB.split(' ').filter(Boolean);
  if (tokensA.length >= 2 && tokensB.length >= 2) {
    const matchingTokens = tokensA.filter(t => tokensB.includes(t));
    if (matchingTokens.length >= 2) return true;
  }
  return normA.includes(normB) || normB.includes(normA);
};

/**
 * Checks if two phone numbers match
 */
export const isPhoneMatch = (phoneA, phoneB) => {
  const pA = normalizePhone(phoneA);
  const pB = normalizePhone(phoneB);
  if (!pA || !pB || pA.length < 8 || pB.length < 8) return false;
  return pA === pB;
};

/**
 * Checks if two emails match
 */
export const isEmailMatch = (emailA, emailB) => {
  if (!emailA || !emailB) return false;
  return String(emailA).trim().toLowerCase() === String(emailB).trim().toLowerCase();
};

/**
 * Checks if addresses match
 */
export const isAddressMatch = (addrA, addrB, cityA, cityB) => {
  const nA = normalizeText(addrA);
  const nB = normalizeText(addrB);
  const cA = normalizeText(cityA);
  const cB = normalizeText(cityB);

  if (nA && nB) {
    if (nA === nB) return true;
    // Check street number + colony match (e.g. "789, MG Road")
    const wordsA = nA.split(',').map(s => s.trim()).filter(Boolean);
    const wordsB = nB.split(',').map(s => s.trim()).filter(Boolean);
    const common = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
    if (common.length >= 2) return true;
  }

  if (cA && cB && cA === cB && (nA.includes(cA) || nB.includes(cB))) {
    return true;
  }

  return false;
};

/**
 * Verifies whether a student belongs to the given parent user.
 * 
 * Returns { isMatch: boolean, confidence: number, criteria: string[] }
 */
export const verifyParentStudentMatch = (parentUser, student, explicitRelations = []) => {
  if (!parentUser || !student) {
    return { isMatch: false, confidence: 0, criteria: [] };
  }

  const pUserId = parentUser.id ? String(parentUser.id) : null;
  const sId = student.id ? String(student.id) : null;
  const criteria = [];
  let score = 0;

  // 1. Check explicit database relationship (parent_student / explicit IDs)
  const isDirectlyLinked = explicitRelations.some(rel => {
    const rParentUserId = rel.parents?.user_id ? String(rel.parents.user_id) : (rel.parent_user_id ? String(rel.parent_user_id) : null);
    const rStudentId = String(rel.student_id);
    return (rParentUserId === pUserId && rStudentId === sId);
  });

  if (isDirectlyLinked) {
    return { isMatch: true, confidence: 100, criteria: ['database_relation'] };
  }

  // Check parentUser.student_ids array
  if (Array.isArray(parentUser.student_ids) && parentUser.student_ids.map(String).includes(sId)) {
    return { isMatch: true, confidence: 100, criteria: ['assigned_student_id'] };
  }

  // Check student.parent_id or student.parent_user_id
  if (student.parent_user_id && String(student.parent_user_id) === pUserId) {
    return { isMatch: true, confidence: 100, criteria: ['student_parent_user_id'] };
  }

  // 2. Extract student's parent and guardian data
  const parentDetails = student.parents?.[0]?.parents || student.parents?.[0] || {};
  const fatherName = student.father_name || parentDetails.father_name || (student.emergency_contact_relation?.toLowerCase() === 'father' ? student.emergency_contact_name : '');
  const motherName = student.mother_name || parentDetails.mother_name || (student.emergency_contact_relation?.toLowerCase() === 'mother' ? student.emergency_contact_name : '');
  const guardianName = student.guardian_name || parentDetails.guardian_name;

  const fatherPhone = student.father_phone || parentDetails.father_phone || (student.emergency_contact_relation?.toLowerCase() === 'father' ? student.emergency_contact_phone : '');
  const motherPhone = student.mother_phone || parentDetails.mother_phone || (student.emergency_contact_relation?.toLowerCase() === 'mother' ? student.emergency_contact_phone : '');
  const guardianPhone = student.guardian_phone || parentDetails.guardian_phone || student.emergency_contact_phone;

  const fatherEmail = student.father_email || parentDetails.father_email;
  const motherEmail = student.mother_email || parentDetails.mother_email;
  const guardianEmail = student.guardian_email || parentDetails.guardian_email;

  const studentAddress = student.user?.address || student.address;
  const studentCity = student.user?.city || student.city;

  const parentName = parentUser.name || '';
  const parentPhone = parentUser.phone || '';
  const parentEmail = parentUser.email || '';
  const parentAddress = parentUser.address || '';
  const parentCity = parentUser.city || '';

  // 3. Name check (Father, Mother, or Guardian)
  let nameMatched = false;
  if (fatherName && isNameMatch(parentName, fatherName)) {
    criteria.push('father_name_match');
    score += 40;
    nameMatched = true;
  } else if (motherName && isNameMatch(parentName, motherName)) {
    criteria.push('mother_name_match');
    score += 40;
    nameMatched = true;
  } else if (guardianName && isNameMatch(parentName, guardianName)) {
    criteria.push('guardian_name_match');
    score += 35;
    nameMatched = true;
  }

  // 4. Phone check (Father, Mother, or Guardian Phone)
  let phoneMatched = false;
  if (parentPhone) {
    if (fatherPhone && isPhoneMatch(parentPhone, fatherPhone)) {
      criteria.push('father_phone_match');
      score += 40;
      phoneMatched = true;
    } else if (motherPhone && isPhoneMatch(parentPhone, motherPhone)) {
      criteria.push('mother_phone_match');
      score += 40;
      phoneMatched = true;
    } else if (guardianPhone && isPhoneMatch(parentPhone, guardianPhone)) {
      criteria.push('emergency_phone_match');
      score += 35;
      phoneMatched = true;
    }
  }

  // 5. Email check
  let emailMatched = false;
  if (parentEmail) {
    if (fatherEmail && isEmailMatch(parentEmail, fatherEmail)) {
      criteria.push('father_email_match');
      score += 30;
      emailMatched = true;
    } else if (motherEmail && isEmailMatch(parentEmail, motherEmail)) {
      criteria.push('mother_email_match');
      score += 30;
      emailMatched = true;
    } else if (guardianEmail && isEmailMatch(parentEmail, guardianEmail)) {
      criteria.push('guardian_email_match');
      score += 25;
      emailMatched = true;
    }
  }

  // 6. Address / Residence check
  let addressMatched = false;
  if (parentAddress && studentAddress) {
    if (isAddressMatch(parentAddress, studentAddress, parentCity, studentCity)) {
      criteria.push('residence_address_match');
      score += 20;
      addressMatched = true;
    }
  }

  // 7. Multi-Criteria Verification Rules
  // Must satisfy at least two reliable matching vectors, or a direct email/phone match with name
  const isMatch =
    (nameMatched && phoneMatched) ||
    (nameMatched && addressMatched) ||
    (phoneMatched && addressMatched) ||
    (emailMatched && (nameMatched || phoneMatched)) ||
    (score >= 60);

  return {
    isMatch,
    confidence: Math.min(100, score),
    criteria
  };
};

/**
 * Finds all linked students for a parent user from the given students list
 */
export const findLinkedStudentsForParent = (parentUser, allStudents = [], explicitRelations = []) => {
  if (!parentUser || !Array.isArray(allStudents) || allStudents.length === 0) {
    return [];
  }

  const linked = [];
  for (const student of allStudents) {
    const result = verifyParentStudentMatch(parentUser, student, explicitRelations);
    if (result.isMatch) {
      linked.push({
        ...student,
        _verification: result
      });
    }
  }

  // Sort by class or id
  linked.sort((a, b) => (a.class_id || 0) - (b.class_id || 0));
  return linked;
};

