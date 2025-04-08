# Project Requirements Document: Altarflow

## 1. Project Overview

Altarflow is a sophisticated, bilingual church management platform designed especially for Hispanic churches in the United States. It bridges traditional church administration with modern digital tools so that even users with limited technical knowledge can manage donations, expenses, and member relationships efficiently. By replacing manual tasks with automated workflows, Altarflow simplifies church operations and improves transparency for financial and member reporting.

This platform is being built to modernize church management systems while respecting cultural and practical traditions. The key objectives include enabling NFC-enabled donations, providing secure and comprehensive payment processing with Stripe Connect, and offering dual-language support (English and Spanish). Success will be measured by the smooth transition of manual processes to digital workflows, ease of use for church administrators, and the ability to handle both one-time and recurring donations seamlessly.

## 2. In-Scope vs. Out-of-Scope

### In-Scope

*   **Bilingual Interface:** Implement language toggles between English and Spanish using react-i18next for manual language selection.

*   **User Authentication & Role-Based Access:** Only one admin (the license purchaser) and up to three additional church staff users with defined viewing/editing privileges.

*   **Donation Management:**

    *   NFC-enabled donation flow where donors tap their NFC-enabled devices to launch a donation landing page.
    *   Integration with Stripe Connect to process both one-time and recurring donations.
    *   Automatic email digital receipts and automatic updates in the donor dashboard.

*   **Expense Management:**

    *   Upload receipts and capture details like amount, category, date, vendor name, and description.
    *   A review and approval process for submitted expenses.

*   **Member Management & Digital Intake Forms:**

    *   Digital intake forms (Connect Cards) to capture detailed visitor/member information.
    *   Profiles including personal details, address, membership status, communication preferences, and custom fields.
    *   Form validation and compliance with privacy standards.

*   **Financial Reporting:**

    *   Generate analytical reports covering donation trends, expenses by category, campaign performance, and KPIs.
    *   Features such as filtering by date ranges and exporting reports in CSV/PDF formats.

*   **UI Customization & Theming:**

    *   Responsive design supporting dark/light modes.
    *   Use of provided branding guidelines with specified color palettes, typography, and design principles using Next.js, Tailwind CSS, and shadcn UI components.

### Out-of-Scope

*   **Donor or Member Account Creation:** For the MVP, only admin and designated staff user accounts exist. Donor and member information will be collected without creating login credentials.
*   **Additional Payment Gateways:** While Stripe Connect is the primary payment processor, further integrations (like direct bank transfers via Plaid) are considered for later phases.
*   **Real-Time Notifications beyond SMS Integration:** Focus will remain on core functionalities without an advanced notification system aside from basic integration (e.g., using Twilio SMS API for essential messages).
*   **Complex AI-driven Enhancements:** Basic AI integrations to support documentation and communication improvements are included, but more advanced predictive analytics or deep learning features will lie outside the MVP.

## 3. User Flow

A church administrator or designated staff first visits the login page of Altarflow. After signing in with secure authentication (powered by Supabase ), they are greeted by a clean, responsive dashboard that respects dark/light mode preferences and offers a language toggle between English and Spanish. On this dashboard, the admin can view licensing details, configure settings, and invite up to three additional staff members with set privileges.

In parallel, at church events or within church premises, donors interact with NFC-enabled readers. When a donor taps their NFC-enabled device, they are immediately directed to a secure donation landing page on their device. Here, the donor enters or selects the donation amount, reviews payment details, and securely completes the transaction via Stripe Connect. A digital receipt is then automatically generated and emailed, and the dashboard is updated in real-time. The digital intake forms for new members and visitors work similarly—users fill in clear, bilingual forms that capture personal, membership, and ministry-related information, ensuring a seamless onboarding process.

## 4. Core Features

*   **Bilingual Interface**

    *   Simple language toggle (English/Spanish) using react-i18next.
    *   All labels, form fields, and content available in both languages.

*   **NFC-Enabled Donation Management**

    *   Trigger donation flow via NFC reader tap.
    *   Donation landing page for selecting or entering donation amounts.
    *   Support for both one-time and recurring donations.
    *   Integration with Stripe Connect for secure processing.
    *   Automatic digital receipt generation and email confirmation.

*   **Expense Management**

    *   Receipt upload functionality to capture images of receipts.
    *   Capture fields: amount, category (utilities, supplies, events, etc.), date, vendor name, and expense description.
    *   Built-in approval process for church staff to review and verify submissions.

*   **Digital Intake and Member Management**

    *   Comprehensive digital intake forms (Connect Cards) to gather visitor/member data.
    *   Standard fields (name, email, phone, address, membership status, join date, ministry involvement) plus custom fields.
    *   Communication preference options with SMS consent tracking (including consent method and date).
    *   Compliance with privacy and data protection standards.

*   **Financial Reporting**

    *   Analytical dashboards showcasing donation trends, donor retention, expenses by category, and campaign performance.
    *   Interactive charts with filtering options.
    *   Report exporting capabilities (CSV/PDF).

*   **Role-Based Access and System Configuration**

    *   Admin user with the ability to invite up to three additional church staff.
    *   Role-based permissions defining viewing and editing capabilities.

*   **UI Customization and Responsive Design**

    *   Consistent use of provided branding guidelines (color palette, typography, dark/light mode).
    *   Components built with Next.js, Tailwind CSS, and shadcn UI.
    *   Responsive layouts for mobile, tablet, and desktop.

*   **AI Integrations**

    *   Basic AI to enhance documentation and automate certain communication processes.
    *   Tools include GPT o1, Claude, Gemini 2.5 Pro, etc., to provide intelligent code and process insights where applicable.

## 5. Tech Stack & Tools

*   **Frontend:**

    *   Next.js (with React) for building the user interface.
    *   Tailwind CSS along with Shadcn UI for styling responsive and adaptive components.
    *   React i18next for bilingual support and language toggling.

*   **Backend & Database:**

    *   Node.js with Next.js API Routes to handle backend logic.
    *   PostgreSQL via Supabase for robust data storage and retrieval.

*   **Authentication:**

    *   Supabase and/or Clerk Auth providing secure role-based authentication and access control.

*   **Payment Processing:**

    *   Stripe Connect for handling NFC-enabled donations and recurring payment workflows.

*   **AI & Code Assistance:**

    *   AI Models like GPT o1, Claude 3.7 Sonnet, Claude 3.5 Sonnet, and Gemini 2.5 Pro are integrated to support code generation and enhance documentation.
    *   V0 by Vercel to assist with frontend component building.
    *   Cursor IDE for AI-enhanced coding assistance.

*   **Additional Integrations:**

    *   Twilio SMS API for SMS communications (e.g., SMS consent notifications).
    *   Use of Next.js Themes and CSS variables for dark/light mode support.

*   **Development Tools:**

    *   Starter kit: CodeGuide Starter Pro from the provided GitHub repository.
    *   Code organization and file structure as outlined, with separate directories for components, hooks, libraries, types, and utilities.

## 6. Non-Functional Requirements

*   **Performance:**

    *   The application should load quickly and efficiently across all devices.
    *   Target response times should be under 2 seconds for key actions (e.g., form submission, dashboard navigation).

*   **Security:**

    *   Use secure authentication through Supabase/Clerk Auth.
    *   Ensure proper API and data security practices around payment integrations and personal data.
    *   Implement role-based access control to restrict data to authorized users only.

*   **Usability:**

    *   Interface design must be simple, clear, and accessible to users with varying levels of technical experience.
    *   Must support responsive and adaptive design for mobile, tablet, and desktop environments.

*   **Compliance:**

    *   Adhere to data privacy standards, especially around member data and SMS consent requirements.
    *   Implement proper encryption and secure storage practices for sensitive information.

*   **Reliability:**

    *   Provide comprehensive error handling and feedback on form submissions and payment processing.
    *   Ensure swift recovery from API issues or network delays.

## 7. Constraints & Assumptions

*   **Constraints:**

    *   The system is limited to one admin tenant who can invite up to three additional staff members.
    *   Donors and members do not create their own accounts; their details are only recorded.
    *   Rely on the availability of third-party services such as Stripe Connect, Supabase, and SMS APIs (Twilio).
    *   NFC functionality depends on compatible hardware at the church premises.

*   **Assumptions:**

    *   Church administrators possess basic digital literacy enabling them to operate the Admin Dashboard.
    *   Cultural nuances and bilingual requirements will be met with manually toggled language settings.
    *   The MVP will focus exclusively on the core features outlined, leaving future enhancements (e.g., extra payment methods, advanced AI analytics) for subsequent phases.
    *   Design assets provided (color palettes, typography, icons) will be followed without major alterations.

## 8. Known Issues & Potential Pitfalls

*   **NFC Integration:**

    *   There may be compatibility issues with certain NFC devices. It is essential to thoroughly test with different hardware configurations.
    *   Ensure that the NFC triggers reliably launch the donation landing page.

*   **Payment Processing:**

    *   Stripe Connect integration must handle both one-time and recurring donations seamlessly. Monitor for any API rate limits or transaction delays.
    *   Contingency plans should be in place if there are connectivity issues with Stripe.

*   **Bilingual & Cultural Adaptation:**

    *   Manual toggling between languages may not detect user preferences automatically. Clear instructions and visible toggle options are needed.
    *   Ensure that translations are accurate and culturally appropriate.

*   **Data Compliance and Security:**

    *   Handling personal and financial data requires rigorous security checks. Any lapses could lead to compliance or privacy issues.
    *   Regular audits and proper logging mechanisms should be set up to catch potential security vulnerabilities.

*   **Role-Based Access Complexity:**

    *   Limiting to only one admin and a few staff members simplifies the system; however, misconfiguration can lead to unauthorized data access.
    *   Implement clear audit trails and review mechanisms to mitigate risks.

*   **User Interface Consistency:**

    *   Maintaining design consistency across both dark and light modes and varying screen sizes may demand careful CSS management and testing.
    *   Use the provided shadcn UI components and Tailwind CSS guidelines to minimize styling issues.

This document encompasses all necessary details to ensure that the Altarflow platform is developed with clarity and precision. Every aspect—from user flow to technical integrations, and from compliance to potential pitfalls—has been described so that subsequent documents (Tech Stack, Frontend Guidelines, etc.) can be generated without guesswork.
