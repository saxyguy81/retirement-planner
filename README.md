# Retirement Planner

A comprehensive retirement planning application with year-by-year projections, tax optimization analysis, Roth conversion modeling, and heir value calculations.

## Features

### Core Calculations
- **Iterative Tax Calculation** - Solves the circular dependency between taxes and withdrawals by iterating until convergence
- **Risk-Based Returns** - Blended returns based on portfolio risk bands (low/moderate/high)
- **Complete Tax Modeling**:
  - Federal income tax with 2024 brackets (inflated annually)
  - Long-term capital gains tax (0%/15%/20% brackets)
  - Net Investment Income Tax (NIIT)
  - Illinois state tax (investment income only)
  - Social Security taxation (combined income method)
  - IRMAA Medicare surcharges (2-year lookback)
- **RMD Calculations** - Required minimum distributions starting at age 73
- **Survivor Scenario** - Models death of primary earner with reduced SS and expenses
- **Heir Value** - After-tax inheritance value accounting for step-up basis and IRA taxation

### User Interface
- **Input Panel** - Collapsible sections for all model parameters
- **Projections Table** - Year-by-year data with selectable year display modes
- **Charts View** - Multiple selectable visualizations (balances, taxes, withdrawals, etc.)
- **Risk Allocation** - Visual breakdown of risk-based asset allocation
- **Heir Analysis** - Inheritance value analysis and optimization insights

## Project Structure

```
retirement-planner/
├── src/
│   ├── lib/                    # Core calculation library
│   │   ├── taxTables.js        # Tax brackets, RMD tables, IRMAA brackets
│   │   ├── calculations.js     # Tax calculation functions
│   │   ├── projections.js      # Year-by-year projection engine
│   │   └── formatters.js       # Currency/percentage formatting
│   ├── hooks/
│   │   └── useProjections.js   # React hook for projection state
│   ├── components/
│   │   ├── InputPanel/         # Model input controls
│   │   ├── ProjectionsTable/   # Data table component
│   │   ├── ChartsView/         # Visualization panel
│   │   ├── RiskAllocation/     # Risk allocation view
│   │   └── HeirAnalysis/       # Heir value analysis
│   ├── App.jsx                 # Main application component
│   ├── main.jsx                # Entry point
│   └── index.css               # Tailwind styles
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Model Parameters

### Starting Accounts
- After-Tax Account (taxable brokerage)
- Traditional IRA
- Roth IRA
- After-Tax Cost Basis (for capital gains calculations)

### Roth Conversions
- Year-by-year conversion amounts
- Impacts IRMAA and current-year taxes

### Returns
- **Account-Based Mode**: Fixed returns per account type
- **Risk-Based Mode**: Blended returns based on risk allocation:
  - Low Risk Target ($3.5M default) @ 4%
  - Moderate Risk Target ($3M default) @ 6%
  - High Risk (remainder) @ 8%

### Tax Parameters
- State tax rate (Illinois 4.95%)
- Capital gains percentage (portion of AT withdrawal that's gains)
- Bracket inflation rate
- Historical MAGI (for IRMAA lookback)

### Survivor Scenario
- Death year
- Survivor SS percentage (default 72%)
- Survivor expense percentage (default 70%)

### Heir Parameters
- Heir federal marginal rate (default 37%)
- Heir state rate (default 4.95%)

## Iterative Tax Calculation

The model uses an iterative approach to solve the circular dependency:

1. Estimate taxes = $0
2. Calculate required withdrawals based on expenses + estimated taxes
3. Calculate actual taxes from those withdrawals
4. Use actual taxes as new estimate
5. Repeat until difference < $100 (typically 2-3 iterations)

Toggle this feature on/off in the header to compare results.

## Future Enhancements

- [ ] Scenario comparison (multiple parameter sets)
- [ ] Monte Carlo simulation
- [ ] Excel import/export
- [ ] PDF report generation
- [ ] Roth conversion optimizer
- [ ] Social Security optimization
- [ ] Required Minimum Distribution strategies

## Technical Notes

### Tax Table Sources
- Federal brackets: IRS Revenue Procedure 2023-34
- IRMAA brackets: CMS 2024 announcement
- RMD table: IRS Uniform Lifetime Table (SECURE 2.0)

### Assumptions
- Tax brackets inflate at 3% annually (configurable)
- No state tax on retirement income (Illinois-specific)
- Senior deduction bonus included
- Both spouses 65+ for filing status calculations

## License

MIT
