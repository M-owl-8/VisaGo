/**
 * Email Templates Service
 * Generates HTML email templates for various notifications
 */

export class EmailTemplatesService {
  /**
   * Payment Confirmation Email
   */
  static paymentConfirmation(params: {
    userName: string;
    transactionId: string;
    amount: number;
    currency: string;
    applicationId: string;
    visaType: string;
    paymentMethod: string;
    date: Date;
    supportEmail?: string;
  }): string {
    const formattedDate = params.date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation - VisaBuddy</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 20px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #1976d2;
      font-weight: 600;
    }
    .details-box {
      background-color: #f9f9f9;
      border-left: 4px solid #1976d2;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #555;
    }
    .detail-value {
      color: #333;
      text-align: right;
    }
    .amount {
      font-size: 24px;
      font-weight: 700;
      color: #1976d2;
      text-align: center;
      padding: 20px;
      background-color: #e3f2fd;
      border-radius: 4px;
      margin: 20px 0;
    }
    .success-badge {
      display: inline-block;
      background-color: #4caf50;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      margin: 10px 0;
    }
    .message {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
      margin: 20px 0;
    }
    .footer {
      background-color: #f0f0f0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
    }
    .button {
      display: inline-block;
      background-color: #1976d2;
      color: white;
      padding: 12px 30px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .support-contact {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 13px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Payment Confirmed</h1>
    </div>
    
    <div class="content">
      <div class="greeting">Dear ${params.userName},</div>
      
      <p class="message">
        Thank you for your payment! We've successfully received your payment for your ${params.visaType} visa application.
      </p>
      
      <div class="success-badge">Payment Successful</div>
      
      <div class="amount">
        ${params.currency} ${(params.amount / 100).toFixed(2)}
      </div>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">${params.transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Application ID:</span>
          <span class="detail-value">${params.applicationId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Visa Type:</span>
          <span class="detail-value">${params.visaType}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Payment Method:</span>
          <span class="detail-value">${params.paymentMethod}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date & Time:</span>
          <span class="detail-value">${formattedDate}</span>
        </div>
      </div>
      
      <p class="message">
        Your application is now in progress. You'll receive email notifications as we process your visa application.
        <br><br>
        You can track your application status anytime by logging into your VisaBuddy account.
      </p>
      
      <div style="text-align: center;">
        <a href="https://visabuddy.com/dashboard" class="button">View Application Status</a>
      </div>
      
      <div class="support-contact">
        ${params.supportEmail ? `<strong>Need help?</strong><br>Contact our support team: ${params.supportEmail}` : ''}
      </div>
    </div>
    
    <div class="footer">
      <p>© 2025 VisaBuddy. All rights reserved.<br>
      This email was sent to you because you have an active account with VisaBuddy.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Payment Failed Email
   */
  static paymentFailed(params: {
    userName: string;
    transactionId?: string;
    amount: number;
    currency: string;
    applicationId: string;
    visaType: string;
    reason: string;
    retryUrl: string;
    supportEmail?: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - VisaBuddy</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 20px;
    }
    .greeting {
      font-size: 18px;
      margin-bottom: 20px;
      color: #f44336;
      font-weight: 600;
    }
    .error-box {
      background-color: #ffebee;
      border-left: 4px solid #f44336;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
      color: #c62828;
    }
    .reason-label {
      font-weight: 600;
      margin-bottom: 5px;
    }
    .message {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
      margin: 20px 0;
    }
    .retry-button {
      display: inline-block;
      background-color: #1976d2;
      color: white;
      padding: 12px 30px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .details-box {
      background-color: #f9f9f9;
      border: 1px solid #eee;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #555;
    }
    .detail-value {
      color: #333;
      text-align: right;
    }
    .footer {
      background-color: #f0f0f0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠ Payment Failed</h1>
    </div>
    
    <div class="content">
      <div class="greeting">Dear ${params.userName},</div>
      
      <p class="message">
        Unfortunately, your payment for the ${params.visaType} visa application could not be processed.
      </p>
      
      <div class="error-box">
        <div class="reason-label">Reason:</div>
        ${params.reason}
      </div>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Application ID:</span>
          <span class="detail-value">${params.applicationId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">${params.currency} ${(params.amount / 100).toFixed(2)}</span>
        </div>
        ${params.transactionId ? `
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">${params.transactionId}</span>
        </div>
        ` : ''}
      </div>
      
      <p class="message">
        Please try again with a different payment method or contact our support team for assistance.
      </p>
      
      <div style="text-align: center;">
        <a href="${params.retryUrl}" class="retry-button">Retry Payment</a>
      </div>
      
      <div class="message">
        <strong>Troubleshooting Tips:</strong>
        <ul>
          <li>Ensure you have sufficient funds in your account</li>
          <li>Check that your card/payment method is valid and not expired</li>
          <li>Try a different payment method</li>
          <li>Contact your bank if the issue persists</li>
        </ul>
      </div>
      
      ${params.supportEmail ? `
      <div class="message">
        If you continue to experience issues, please contact our support team at ${params.supportEmail}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>© 2025 VisaBuddy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Visa Application Status Update Email
   */
  static visaStatusUpdate(params: {
    userName: string;
    applicationId: string;
    visaType: string;
    status: 'submitted' | 'processing' | 'approved' | 'rejected' | 'on_hold';
    message: string;
    dashboardUrl: string;
    supportEmail?: string;
  }): string {
    const statusColors: Record<string, { bgColor: string; textColor: string; icon: string }> = {
      submitted: { bgColor: '#e3f2fd', textColor: '#1976d2', icon: '📋' },
      processing: { bgColor: '#fff3e0', textColor: '#f57c00', icon: '⏳' },
      approved: { bgColor: '#e8f5e9', textColor: '#388e3c', icon: '✓' },
      rejected: { bgColor: '#ffebee', textColor: '#d32f2f', icon: '✗' },
      on_hold: { bgColor: '#f3e5f5', textColor: '#7b1fa2', icon: '⏸' },
    };

    const statusConfig = statusColors[params.status];

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update - VisaBuddy</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .content {
      padding: 40px 20px;
    }
    .status-badge {
      background-color: ${statusConfig.bgColor};
      color: ${statusConfig.textColor};
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
    }
    .message {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
      margin: 20px 0;
    }
    .details-box {
      background-color: #f9f9f9;
      border-left: 4px solid #1976d2;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .detail-label {
      font-weight: 600;
      color: #555;
    }
    .view-button {
      display: inline-block;
      background-color: #1976d2;
      color: white;
      padding: 12px 30px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      text-align: center;
      margin: 20px 0;
    }
    .footer {
      background-color: #f0f0f0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusConfig.icon} Application Status Update</h1>
    </div>
    
    <div class="content">
      <p class="message">Hello ${params.userName},</p>
      
      <p class="message">
        We have an update on your ${params.visaType} visa application.
      </p>
      
      <div class="status-badge">
        ${params.status.replace(/_/g, ' ').toUpperCase()}
      </div>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Application ID:</span>
          <span>${params.applicationId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Visa Type:</span>
          <span>${params.visaType}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status:</span>
          <span>${params.status.replace(/_/g, ' ').toUpperCase()}</span>
        </div>
      </div>
      
      <p class="message">
        ${params.message}
      </p>
      
      <div style="text-align: center;">
        <a href="${params.dashboardUrl}" class="view-button">View Full Application</a>
      </div>
      
      ${params.supportEmail ? `
      <p class="message" style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        Questions? Contact us at ${params.supportEmail}
      </p>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>© 2025 VisaBuddy. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Welcome Email
   */
  static welcome(params: {
    userName: string;
    email: string;
    supportEmail?: string;
  }): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to VisaBuddy</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
    }
    .content {
      padding: 40px 20px;
    }
    .message {
      color: #666;
      font-size: 14px;
      line-height: 1.8;
      margin: 20px 0;
    }
    .feature-list {
      list-style: none;
      padding: 0;
    }
    .feature-list li {
      padding: 10px 0;
      border-bottom: 1px solid #eee;
      padding-left: 30px;
      position: relative;
    }
    .feature-list li:before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #1976d2;
      font-weight: bold;
    }
    .button {
      display: inline-block;
      background-color: #1976d2;
      color: white;
      padding: 12px 30px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f0f0f0;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to VisaBuddy! 🎉</h1>
    </div>
    
    <div class="content">
      <p class="message">Hi ${params.userName},</p>
      
      <p class="message">
        Thank you for joining VisaBuddy! We're excited to help you with your visa application journey.
      </p>
      
      <p class="message"><strong>What you can do now:</strong></p>
      <ul class="feature-list">
        <li>Create and manage your visa applications</li>
        <li>Upload documents securely</li>
        <li>Track your application status in real-time</li>
        <li>Chat with our AI assistant for visa guidance</li>
        <li>Receive payment reminders and notifications</li>
      </ul>
      
      <p class="message">
        Let's get started! Click the button below to explore your account.
      </p>
      
      <div style="text-align: center;">
        <a href="https://visabuddy.com/dashboard" class="button">Start Now</a>
      </div>
      
      ${params.supportEmail ? `
      <p class="message" style="font-size: 12px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
        If you have any questions, our support team is here to help: ${params.supportEmail}
      </p>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>© 2025 VisaBuddy. All rights reserved.<br>
      Registered email: ${params.email}</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}