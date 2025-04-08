flowchart TD
    A[Login and Onboarding] 
    B[Main Dashboard] 
    C[Donation Management] 
    D[Expense Management] 
    E[Member Management] 
    F[Settings]
    G[Error Handling]

    A --> B
    B --> C
    B --> D
    B --> E
    B --> F

    %% Donation Management Flow
    C --> C1[Donor taps NFC]
    C1 --> C2[Donation Landing Page]
    C2 --> C3[Enter or Select Amount]
    C3 --> C4[Payment via Stripe Connect]
    C4 --> C5[Digital Receipt Generated]
    C5 --> C6[Update Donor Dashboard]
    C4 -- Payment Error --> G

    %% Expense Management Flow
    D --> D1[Upload Receipt]
    D1 --> D2[Enter Expense Details]
    D2 --> D3[Expense Approval Process]
    D3 --> D4[Finalize Expense Record]
    D1 -- Upload Error --> G

    %% Member Management Flow
    E --> E1[Fill Connect Card Form]
    E1 --> E2[Capture Personal and Membership Info]
    E2 --> E3[Update Member Profile]
    E1 -- Form Validation Error --> G

    %% Settings and Account Management Flow
    F --> F1[Account Management]
    F1 --> F2[Invite Staff and Set Privileges]
    F --> F3[Theme and Language Toggle]

    %% Error Handling can catch issues from multiple paths
    G --> A