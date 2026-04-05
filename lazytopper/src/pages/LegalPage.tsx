import React from "react";
import { useParams } from "react-router-dom";

const PAGES: Record<string, { title: string; content: React.ReactNode }> = {
  privacy: {
    title: "Privacy Policy",
    content: (
      <>
        <p><strong>Last updated:</strong> April 2026</p>
        <h2>Information We Collect</h2>
        <p>LazyTopper collects the following information when you create an account:</p>
        <ul>
          <li>Email address or phone number (for authentication)</li>
          <li>Display name (optional)</li>
          <li>Learning progress data (questions attempted, scores, mastery levels)</li>
        </ul>
        <h2>How We Use Your Data</h2>
        <ul>
          <li>To provide personalized learning recommendations</li>
          <li>To track your study progress and streak</li>
          <li>To generate performance analytics</li>
          <li>To improve our prediction algorithms</li>
        </ul>
        <h2>Data Storage</h2>
        <p>Your data is stored securely using Firebase (Google Cloud Platform). Learning progress is stored locally on your device and optionally synced to the cloud for cross-device access.</p>
        <h2>Third-Party Services</h2>
        <p>We use Firebase Authentication (Google) for secure sign-in. We do not sell your data to any third party.</p>
        <h2>Your Rights</h2>
        <p>You can request deletion of your account and all associated data by contacting us at hello@lazytopper.app.</p>
        <h2>Contact</h2>
        <p>For privacy-related questions, email us at hello@lazytopper.app.</p>
      </>
    ),
  },
  terms: {
    title: "Terms of Service",
    content: (
      <>
        <p><strong>Last updated:</strong> April 2026</p>
        <h2>Acceptance of Terms</h2>
        <p>By using LazyTopper, you agree to these terms. LazyTopper is an educational tool for CBSE Class 10 exam preparation.</p>
        <h2>Service Description</h2>
        <p>LazyTopper provides AI-powered exam preparation including trend analysis, predicted questions, mock tests, and AI tutoring based on 10 years of CBSE board exam data.</p>
        <h2>Disclaimer</h2>
        <p>LazyTopper provides data-driven predictions based on historical CBSE patterns. These are not guaranteed exam questions. We do not guarantee any specific exam results or scores.</p>
        <h2>User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account. You must be at least 13 years old to use LazyTopper.</p>
        <h2>Subscription & Payment</h2>
        <p>Free tier features are available without payment. Premium features require a subscription at the listed prices. You can cancel your subscription at any time.</p>
        <h2>Intellectual Property</h2>
        <p>All content, including prediction algorithms, question banks, and AI-generated explanations, is the property of LazyTopper.</p>
        <h2>Contact</h2>
        <p>For questions about these terms, email us at hello@lazytopper.app.</p>
      </>
    ),
  },
  refund: {
    title: "Refund Policy",
    content: (
      <>
        <p><strong>Last updated:</strong> April 2026</p>
        <h2>Free Trial</h2>
        <p>LazyTopper offers a 7-day free trial of Premium features. No payment is required during the trial period.</p>
        <h2>Refund Eligibility</h2>
        <p>If you are not satisfied with your Premium subscription, you may request a full refund within 7 days of your first payment. Refund requests after 7 days will be processed on a pro-rata basis for the unused portion of your subscription.</p>
        <h2>How to Request a Refund</h2>
        <p>Email us at hello@lazytopper.app with your registered email/phone number and reason for the refund. We will process your request within 5-7 business days.</p>
        <h2>Non-Refundable Items</h2>
        <p>Board Season Packs and Annual plans that have been used for more than 30 days are non-refundable, but you can cancel to prevent future charges.</p>
        <h2>Contact</h2>
        <p>For refund-related questions, email us at hello@lazytopper.app.</p>
      </>
    ),
  },
};

const LegalPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const page = PAGES[slug || ""];

  if (!page) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <h2>Page not found</h2>
        <button type="button" onClick={() => { window.location.href = "/"; }} style={{
          marginTop: 16, border: "none", borderBottom: "4px solid #46a302",
          borderRadius: 16, padding: "12px 24px", background: "#58cc02",
          color: "#fff", fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
          textTransform: "uppercase",
        }}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 720, margin: "0 auto", padding: "40px 20px 80px",
      fontFamily: '"Nunito", "Segoe UI", system-ui, sans-serif',
      color: "rgba(255,255,255,0.85)", lineHeight: 1.7,
    }}>
      <button type="button" onClick={() => { window.location.href = "/"; }} style={{
        background: "none", border: "none", color: "#58cc02", fontWeight: 700,
        fontSize: "0.88rem", cursor: "pointer", padding: 0, marginBottom: 16,
      }}>
        ← Back to Home
      </button>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 24 }}>
        {page.title}
      </h1>
      <div style={{ fontSize: "0.95rem" }}>
        {page.content}
      </div>
    </div>
  );
};

export default LegalPage;
