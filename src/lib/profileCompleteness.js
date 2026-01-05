/**
 * Profile Completeness Calculator
 *
 * Calculate profile completeness for progress indicator.
 * Uses endowed progress: starts at 20% ("Getting Started" complete)
 * to create psychological momentum (40% higher completion rates).
 */

/**
 * Calculate how complete the user's profile is
 * @param {Object} params - The projection parameters
 * @param {Object} settings - The app settings
 * @returns {Object} - { percentage, completed, remaining }
 */
export function calculateCompleteness(params, settings) {
  const checks = [
    // Endowed (always complete) - creates psychological momentum
    {
      id: 'started',
      label: 'Getting Started',
      weight: 20,
      complete: true,
    },

    // Essential items
    {
      id: 'profile',
      label: 'Your Profile',
      weight: 15,
      complete: settings?.primaryBirthYear && settings.primaryBirthYear > 1900,
    },
    {
      id: 'accounts',
      label: 'Starting Accounts',
      weight: 20,
      complete:
        (params?.afterTaxStart || 0) + (params?.iraStart || 0) + (params?.rothStart || 0) > 0,
    },
    {
      id: 'expenses',
      label: 'Annual Expenses',
      weight: 15,
      complete: (params?.annualExpenses || 0) > 0,
    },
    {
      id: 'income',
      label: 'Social Security',
      weight: 10,
      complete: (params?.socialSecurityMonthly || 0) > 0,
    },

    // Advanced (bonus items)
    {
      id: 'conversions',
      label: 'Roth Strategy',
      weight: 10,
      complete: Object.keys(params?.rothConversions || {}).length > 0,
    },
    {
      id: 'heirs',
      label: 'Heir Info',
      weight: 10,
      complete: (params?.heirs || []).length > 0,
    },
  ];

  const completed = checks.filter(c => c.complete);
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const completedWeight = completed.reduce((sum, c) => sum + c.weight, 0);

  return {
    percentage: Math.round((completedWeight / totalWeight) * 100),
    completed: completed.map(c => c.id),
    remaining: checks.filter(c => !c.complete).map(c => ({ id: c.id, label: c.label })),
  };
}

export default calculateCompleteness;
