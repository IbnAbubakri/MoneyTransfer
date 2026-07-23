# AI-Powered Saudi Riyal to Naira Exchange Platform

## Project Overview

I want to build an AI-powered foreign exchange platform that allows customers to convert Saudi Riyal (SAR) to Nigerian Naira (NGN). The AI will serve as the company's virtual customer service representative, guiding users through the entire exchange process from start to finish.

The AI is responsible for communicating with customers, while all calculations, business rules, and transaction management are handled by the backend system. Human administrators will only step in when payment verification or fund transfers require manual approval.

The objective is to create a fast, professional, and mostly automated exchange platform that minimizes manual communication while maintaining human oversight for financial transactions.

---

# User Journey

### Step 1 – Account Registration

A new customer creates an account using their:
* Full Name
* Email Address
* Phone Number
* Password

After successful registration, the customer logs into the platform.

---

### Step 2 – AI Welcome Message

When the customer opens the chat, the AI greets them professionally.

Example:
> Hello! Welcome to **[Company Name]**.
>
> I'm your AI exchange assistant. I can help you convert Saudi Riyal (SAR) to Nigerian Naira (NGN).
>
> How much Saudi Riyal would you like to exchange today?

The AI should answer questions naturally using the company's knowledge base, including information such as business hours, exchange policies, payment procedures, and frequently asked questions.

---

### Step 3 – Exchange Request

The customer enters the amount of Saudi Riyal they want to exchange.

Example:
> I want to exchange **2,500 SAR**.

The backend retrieves the current exchange rate configured by the administrator.

Example:
* Current Rate: ₦430 per SAR

The backend performs the calculation and returns the result.

The AI responds:
> You want to exchange **2,500 SAR**.
>
> Current exchange rate: **₦430 per SAR**
>
> You will receive **₦1,075,000**.
>
> If you agree with this rate, reply **YES** to continue.
>
> Reply **NO** to cancel this transaction.

---

### Step 4 – Customer Decision

If the customer replies **NO**, the AI politely ends the transaction.

If the customer replies **YES**, the backend creates a new transaction and assigns it a unique transaction reference.

Example:
TXN-20260723-0001

The transaction status becomes:
**Waiting for Payment**

---

### Step 5 – Payment Instructions

The AI displays the company's bank account details.

Example:
Bank Name
Account Number
Account Name
Amount to Pay

The AI then instructs the customer to upload a screenshot or image of the payment receipt after making the transfer.

---

### Step 6 – Receipt Upload

The customer uploads the payment receipt.

The AI immediately responds:
> Thank you.
>
> Your payment receipt has been received.
>
> Our team is currently verifying your payment.
>
> Verification usually takes between 2 and 3 minutes.

The transaction status changes to:
**Payment Under Review**

---

# Admin Workflow

The system includes a secure, mobile-friendly admin dashboard.

The dashboard updates in real time whenever a customer submits a receipt.

The administrator receives an instant notification and sees:
* Customer Name
* Transaction ID
* Amount
* Exchange Rate
* Naira Amount
* Uploaded Receipt
* Time Submitted

The administrator has the following actions available:
* Approve Payment
* Reject Payment
* Request Another Receipt

No manual messaging should be required.

---

### Step 7 – Payment Approved

If payment is approved:

The transaction status changes to:
**Payment Confirmed**

The AI automatically informs the customer:
> Your payment has been confirmed.
>
> Please send the following information:
>
> * Bank Name
> * Account Number
> * Account Holder's Name

---

### Step 8 – Bank Details

The customer submits their Nigerian bank details.

The backend stores this information securely.

The admin dashboard immediately updates with the customer's payout information.

---

### Step 9 – Naira Transfer

The administrator transfers the Naira manually using their banking platform.

After completing the transfer, the administrator enters the transfer reference and uploads the transfer receipt through the dashboard.

The administrator then clicks:
**Complete Transfer**

---

### Step 10 – Transaction Completed

Once the administrator completes the transfer, the system automatically:

* Marks the transaction as completed.
* Stores the transfer reference.
* Saves the transfer receipt.
* Sends the receipt to the customer.
* Updates the customer's transaction history.
* Notifies the customer that the transfer has been completed.

The AI sends:
> Your transfer has been completed successfully.
>
> Your transfer receipt is attached below.
>
> Thank you for choosing **[Company Name]**.

---

# Customer Dashboard

Customers should have access to:
* AI Chat
* Transaction History
* Pending Transactions
* Completed Transactions
* Cancelled Transactions
* Download Transfer Receipts
* Profile Management

---

# Admin Dashboard

The administrator should have access to:
* Dashboard Overview
* Pending Payments
* Transactions Awaiting Approval
* Completed Transactions
* Cancelled Transactions
* Exchange Rate Management
* Customer Management
* AI Knowledge Base Management
* Notifications
* Reports
* Audit Logs

The administrator should also be able to manually update the Saudi Riyal exchange rate at any time.

---

# AI Responsibilities

The AI should:
* Welcome customers.
* Answer customer questions using the company's knowledge base.
* Guide users through the exchange process.
* Display exchange rates.
* Explain company policies.
* Collect required customer information.
* Update customers automatically as transaction statuses change.
* Never make financial approval decisions.

---

# Backend Responsibilities

The backend is responsible for:
* Calculating exchange amounts.
* Creating transactions.
* Managing transaction statuses.
* Storing customer information.
* Managing exchange rates.
* Sending notifications.
* Managing uploaded files.
* Maintaining audit logs.
* Triggering AI responses.

---

# Administrator Responsibilities

The administrator is responsible for:
* Updating exchange rates.
* Verifying customer payments.
* Rejecting invalid payments.
* Transferring Naira.
* Uploading transfer receipts.
* Completing transactions.

---

# Core Design Principle

The AI should never make financial decisions.

The AI is responsible for communication.

The backend is responsible for business logic.

The administrator is responsible for financial approvals and fund transfers.

This separation ensures the platform is secure, scalable, maintainable, and suitable for handling financial transactions while providing customers with a fast and seamless experience.