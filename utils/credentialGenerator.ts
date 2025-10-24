/**
 * Utility functions for generating teacher credentials
 */

/**
 * Generate a unique username based on teacher's name
 * Format: firstname.lastname or firstname.lastname1, firstname.lastname2, etc.
 */
export const generateUsername = (firstName: string, lastName: string, existingUsernames: string[] = []): string => {
  const baseUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  
  // If base username doesn't exist, use it
  if (!existingUsernames.includes(baseUsername)) {
    return baseUsername;
  }
  
  // If it exists, add a number suffix
  let counter = 1;
  let newUsername = `${baseUsername}${counter}`;
  
  while (existingUsernames.includes(newUsername)) {
    counter++;
    newUsername = `${baseUsername}${counter}`;
  }
  
  return newUsername;
};

/**
 * Generate a secure random password
 * Requirements:
 * - At least 8 characters
 * - Mix of uppercase, lowercase, numbers, and special characters
 */
export const generatePassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < 10; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Generate both username and password for a teacher
 */
export const generateCredentials = (
  firstName: string,
  lastName: string,
  existingUsernames: string[] = []
): { username: string; password: string } => {
  return {
    username: generateUsername(firstName, lastName, existingUsernames),
    password: generatePassword()
  };
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

/**
 * Format credentials for display/sharing
 */
export const formatCredentials = (username: string, password: string): string => {
  return `Username: ${username}\nPassword: ${password}`;
};

