import { useI18n } from "@/contexts/I18nContext";

export default function TreasuryOverview() {
  const { messages } = useI18n();
  
  return (
    <section className="treasury_overview treasury_overview_sticky">
      <h3>{messages.treasuryOverview.title}</h3>
      <div className="treasury_balance">
        <label>{messages.treasuryOverview.mainTreasuryBalance}</label>
        <p className="balance_amount">500,000,000 CKB</p>
      </div>
      <button className="view_treasury_button">
        {messages.treasuryOverview.viewTreasuryDetails}
      </button>
    </section>
  );
}


