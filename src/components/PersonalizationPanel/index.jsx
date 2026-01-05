/**
 * PersonalizationPanel Component
 *
 * Floating panel (not modal) for quick personalization
 * - Dismissible at any time (sample data remains usable)
 * - 3 simple questions: birth year, savings, expenses
 * - Smart defaults derived from answers
 * - Encouraging micro-copy throughout
 */

import { X } from 'lucide-react';
import { useState } from 'react';

// Savings amount options with their values
const SAVINGS_OPTIONS = [
  { label: '$250K', value: 250000 },
  { label: '$500K', value: 500000 },
  { label: '$1M', value: 1000000 },
  { label: '$2M', value: 2000000 },
  { label: '$3M+', value: 3000000 },
];

/**
 * Derive full params from 3 simple answers
 */
function deriveParams(answers) {
  const { birthYear, totalSavings, monthlyExpenses } = answers;
  const currentYear = new Date().getFullYear();

  // Split savings: 25% AT, 55% IRA, 20% Roth (typical ratio)
  const afterTaxStart = Math.round(totalSavings * 0.25);
  const iraStart = Math.round(totalSavings * 0.55);
  const rothStart = Math.round(totalSavings * 0.2);

  return {
    // Timeline: plan from now to age 95
    startYear: currentYear,
    endYear: birthYear + 95,

    // Accounts
    afterTaxStart,
    iraStart,
    rothStart,
    afterTaxCostBasis: Math.round(afterTaxStart * 0.6), // Assume 60% is gains

    // Expenses
    annualExpenses: monthlyExpenses * 12,

    // Social Security estimate based on age
    // Rough estimate: $2,500/mo for someone younger, $3,000/mo for someone older
    socialSecurityMonthly: birthYear > 1965 ? 2500 : 3000,

    // Clear any sample Roth conversions - user can add their own
    rothConversions: {},
  };
}

/**
 * Derive settings from birth year answer
 */
function deriveSettings(birthYear) {
  return {
    primaryBirthYear: birthYear,
    primaryName: 'You',
    spouseBirthYear: birthYear + 2, // Reasonable default
    spouseName: 'Spouse',
  };
}

export function PersonalizationPanel({ onComplete, onDismiss }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    birthYear: null,
    totalSavings: null,
    monthlyExpenses: null,
  });
  const [localBirthYear, setLocalBirthYear] = useState('');
  const [localExpenses, setLocalExpenses] = useState('');

  // Encouraging messages for each step
  const encouragement = {
    1: 'Great start! This helps us calculate your timeline.',
    2: "Nice! You've already taken the important step of saving.",
    3: 'Almost there! This helps us project your needs.',
  };

  const handleComplete = () => {
    if (answers.birthYear && answers.totalSavings && answers.monthlyExpenses) {
      const derivedParams = deriveParams(answers);
      const derivedSettings = deriveSettings(answers.birthYear);
      onComplete(derivedParams, derivedSettings);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return answers.birthYear && answers.birthYear >= 1930 && answers.birthYear <= 2000;
      case 2:
        return answers.totalSavings !== null && answers.totalSavings > 0;
      case 3:
        return answers.monthlyExpenses && answers.monthlyExpenses > 0;
      default:
        return false;
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 w-80 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50"
      role="dialog"
      aria-labelledby="personalize-title"
      aria-describedby="personalize-desc"
    >
      {/* Progress dots */}
      <div className="px-4 pt-4">
        <div
          className="flex gap-1 mb-3"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin="1"
          aria-valuemax="3"
          aria-label={`Step ${step} of 3`}
        >
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className={`h-1 flex-1 rounded transition-colors ${
                n <= step ? 'bg-blue-500' : 'bg-slate-600'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-slate-500 hover:text-slate-400 p-1"
        aria-label="Close personalization panel"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="px-4 pb-4">
        <p id="personalize-desc" className="text-green-400 text-xs mb-3">
          {encouragement[step]}
        </p>

        {/* Step 1: Birth Year */}
        {step === 1 && (
          <div>
            <h3 id="personalize-title" className="text-slate-200 font-medium mb-3">
              What year were you born?
            </h3>
            <input
              type="number"
              value={localBirthYear}
              onChange={e => {
                setLocalBirthYear(e.target.value);
                const year = parseInt(e.target.value);
                if (year >= 1930 && year <= 2000) {
                  setAnswers({ ...answers, birthYear: year });
                }
              }}
              placeholder="e.g., 1965"
              className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
              aria-describedby="birth-year-hint"
              autoFocus
            />
            <p id="birth-year-hint" className="text-slate-500 text-xs mt-2">
              Used to calculate your timeline and Social Security timing
            </p>
          </div>
        )}

        {/* Step 2: Total Savings */}
        {step === 2 && (
          <div>
            <h3 id="personalize-title" className="text-slate-200 font-medium mb-3">
              Roughly how much have you saved for retirement?
            </h3>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Savings amount options">
              {SAVINGS_OPTIONS.map(option => (
                <button
                  key={option.label}
                  onClick={() => setAnswers({ ...answers, totalSavings: option.value })}
                  className={`flex-1 min-w-[60px] py-2 rounded text-xs transition-colors ${
                    answers.totalSavings === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-slate-500 text-xs mt-3">
              Include 401k, IRA, Roth, and taxable accounts
            </p>
          </div>
        )}

        {/* Step 3: Monthly Expenses */}
        {step === 3 && (
          <div>
            <h3 id="personalize-title" className="text-slate-200 font-medium mb-3">
              What are your monthly expenses?
            </h3>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                value={localExpenses}
                onChange={e => {
                  setLocalExpenses(e.target.value);
                  const amount = parseInt(e.target.value);
                  if (amount > 0) {
                    setAnswers({ ...answers, monthlyExpenses: amount });
                  }
                }}
                placeholder="6,000"
                className="w-full bg-slate-900 border border-slate-600 rounded pl-7 pr-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none"
                aria-describedby="expense-hint"
                autoFocus
              />
            </div>
            <p id="expense-hint" className="text-slate-500 text-xs mt-2">
              Housing, food, healthcare, travel, etc.
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => (step === 1 ? onDismiss() : setStep(s => s - 1))}
            className="text-slate-400 text-sm hover:text-slate-300"
          >
            {step === 1 ? 'Skip for now' : 'Back'}
          </button>
          <button
            onClick={() => {
              if (step < 3) {
                setStep(s => s + 1);
              } else {
                handleComplete();
              }
            }}
            disabled={!canProceed()}
            className={`px-4 py-1.5 rounded text-sm transition-colors ${
              canProceed()
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {step < 3 ? 'Next' : 'See My Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PersonalizationPanel;
