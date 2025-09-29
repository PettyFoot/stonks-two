/**
 * Email HTML templates for Trade Voyager Analytics
 */

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  subscriptionTier: string;
  trialEndDate: string;
  customerPortalUrl: string;
  supportEmail: string;
  appUrl: string;
}

export interface SignupWelcomeEmailData {
  userName: string;
  userEmail: string;
  supportEmail: string;
  appUrl: string;
}

export interface CouponEmailData {
  userName: string;
  userEmail: string;
  supportEmail: string;
  appUrl: string;
}

export interface FeedbackEmailData {
  userName: string;
  userEmail: string;
  feedbackUrl: string;
  supportEmail: string;
  appUrl: string;
}

/**
 * Base HTML email template with logo and styling
 */
export const getEmailTemplate = (content: string, title: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      max-width: 120px;
      height: auto;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1a202c;
      font-size: 24px;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .content p {
      margin-bottom: 16px;
      font-size: 16px;
      line-height: 1.6;
    }
    .highlight-box {
      background-color: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 24px 0;
      border-radius: 0 4px 4px 0;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-weight: 600;
      margin: 8px 8px 8px 0;
      font-size: 14px;
    }
    .btn:hover {
      text-decoration: none;
    }
    .benefits {
      background-color: #f7fafc;
      padding: 24px;
      border-radius: 8px;
      margin: 24px 0;
    }
    .benefits ul {
      margin: 0;
      padding-left: 20px;
    }
    .benefits li {
      margin-bottom: 8px;
      font-size: 15px;
    }
    .footer {
      background-color: #1a202c;
      color: #cbd5e0;
      padding: 30px;
      text-align: center;
      font-size: 14px;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e2e8f0;
      margin: 24px 0;
    }
    .trial-badge {
      background-color: #48bb78;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      display: inline-block;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;

/**
 * Welcome email for new premium subscribers
 */
export const getWelcomeEmailContent = (data: WelcomeEmailData): string => {
  const content = `
    <div class="header">
      <img src="${data.appUrl}/api/logo" alt="Trade Voyager Analytics Logo" class="logo">
      <h1>Welcome to Trade Voyager Analytics! <span class="trial-badge">14-Day Free Trial</span></h1>
    </div>

    <div class="content">
      <h2>Hi ${data.userName}!</h2>

      <p>Thank you so much for joining Trade Voyager Analytics Premium! We're absolutely excited for you to experience the full power of our advanced trading analytics platform.</p>

      <p><strong>Your 14-day free trial is now active!</strong> You can explore all premium features until ${data.trialEndDate}. No charges until your trial ends.</p>

      <div class="benefits">
        <h3 style="margin-top: 0; color: #1a202c;">What you now have access to:</h3>
        <ul>
          <li>Advanced portfolio analytics and performance tracking</li>
          <li>Auto broker sync via Broker Connect</li>
          <li>Unlimited API calls for candlestick charts</li>
          <li>Unlimited daily trade uploads</li>
          <li>Comprehensive trade journaling and analysis</li>
        </ul>
      </div>

      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #1a202c;">Quick Start Guide:</h3>
        <p style="margin-bottom: 0;">
          1. <strong>Explore your dashboard</strong> - Get familiar with your new analytics tools<br>
          2. <strong>Connect your accounts</strong> - Link your brokerage accounts for automatic trade tracking<br>
          3. <strong>Start journaling</strong> - Record your trades and analyze your performance
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.appUrl}/dashboard" class="btn">Start Using Your Premium Features</a>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">Manage Your Subscription</h3>
      <p>You have complete control over your subscription:</p>
      <ul>
        <li><strong>Update Payment Method:</strong> Change your card or billing details anytime</li>
        <li><strong>Cancel Anytime:</strong> No long-term commitments - cancel with just one click</li>
        <li><strong>Billing Portal:</strong> View invoices, update information, and manage your account</li>
      </ul>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.customerPortalUrl}" class="btn">Manage Subscription</a>
        <a href="mailto:${data.supportEmail}" class="btn" style="background: #718096;">Contact Support</a>
      </div>

      <div class="divider"></div>

      <p><strong>Need help getting started?</strong> Our support team is here to help you make the most of your premium features. Don't hesitate to reach out!</p>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        Happy Trading!<br>
        <strong>The Trade Voyager Analytics Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>Trade Voyager Analytics</strong></p>
      <p>Professional Trading Analytics & Portfolio Management</p>
      <p>
        <a href="${data.appUrl}">Visit Dashboard</a> •
        <a href="mailto:${data.supportEmail}">Support</a> •
        <a href="${data.customerPortalUrl}">Manage Subscription</a>
      </p>
      <p style="font-size: 12px; margin-top: 20px;">
        This email was sent because you subscribed to Trade Voyager Analytics Premium.<br>
        You can manage your subscription preferences at any time through your account settings.
      </p>
    </div>
  `;

  return getEmailTemplate(content, 'Welcome to Trade Voyager Analytics Premium!');
};

/**
 * Generate welcome email for subscription
 */
export const generateWelcomeEmail = (data: WelcomeEmailData) => ({
  subject: 'Welcome to Trade Voyager Analytics Premium! (14-Day Free Trial)',
  html: getWelcomeEmailContent(data),
  text: generateWelcomeTextEmail(data)
});

/**
 * Plain text version of welcome email
 */
const generateWelcomeTextEmail = (data: WelcomeEmailData): string => {
  return `
Welcome to Trade Voyager Analytics Premium! (14-Day Free Trial)

Hi ${data.userName}!

Thank you so much for joining Trade Voyager Analytics Premium! We're absolutely excited for you to experience the full power of our advanced trading analytics platform.

Your 14-day free trial is now active! You can explore all premium features until ${data.trialEndDate}. No charges until your trial ends.

What you now have access to:
• Advanced portfolio analytics and performance tracking
• Auto broker sync via Broker Connect
• Unlimited API calls for candlestick charts
• Unlimited daily trade uploads
• Comprehensive trade journaling and analysis

Quick Start Guide:
1. Explore your dashboard - Get familiar with your new analytics tools
2. Connect your accounts - Link your brokerage accounts for automatic trade tracking
3. Start journaling - Record your trades and analyze your performance

Get started: ${data.appUrl}/dashboard

Manage Your Subscription:
You have complete control over your subscription:
• Update Payment Method: Change your card or billing details anytime
• Cancel Anytime: No long-term commitments - cancel with just one click
• Billing Portal: View invoices, update information, and manage your account

Manage subscription: ${data.customerPortalUrl}
Contact support: ${data.supportEmail}

Need help getting started? Our support team is here to help you make the most of your premium features. Don't hesitate to reach out!

Happy Trading!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Support: ${data.supportEmail}
Manage Subscription: ${data.customerPortalUrl}
  `.trim();
};

/**
 * Welcome email for new user signups (non-premium)
 */
export const getSignupWelcomeEmailContent = (data: SignupWelcomeEmailData): string => {
  const content = `
    <div class="header">
      <img src="${data.appUrl}/api/logo" alt="Trade Voyager Analytics Logo" class="logo">
      <h1>Welcome to Trade Voyager Analytics!</h1>
    </div>

    <div class="content">
      <h2>Hi ${data.userName}!</h2>

      <p>Welcome to Trade Voyager Analytics! We're excited to have you join our community of traders who are serious about improving their trading performance.</p>

      <p>Your account is now active and you can start using our free features right away.</p>

      <div class="benefits">
        <h3 style="margin-top: 0; color: #1a202c;">What you can do with your account:</h3>
        <ul>
          <li>Trade logging and notes</li>
          <li>Performance overview</li>
          <li>Access to detailed reports</li>
          <li>View trade breakdowns by individual executions</li>
          <li>Upload CSV files to import trade data</li>
          <li>Upgrade to premium for auto broker sync via Broker Connect</li>
        </ul>
      </div>

      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #1a202c;">Getting Started:</h3>
        <p style="margin-bottom: 0;">
          1. <strong>Complete your profile</strong> - Add your trading preferences and goals<br>
          2. <strong>Start logging trades</strong> - Record your first trade to see how it works<br>
          3. <strong>Explore the dashboard</strong> - Get familiar with the available tools<br>
          4. <strong>Check out Premium</strong> - See what advanced features are available
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.appUrl}/dashboard" class="btn">Access Your Dashboard</a>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">Ready for More?</h3>
      <p>When you're ready to take your trading to the next level, check out our Premium features:</p>
      <ul>
        <li><strong>Advanced Analytics:</strong> Deep portfolio insights and performance metrics</li>
        <li><strong>Real-time Data:</strong> Professional charts and market data</li>
        <li><strong>Enhanced Tools:</strong> Advanced journaling and analysis features</li>
      </ul>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.appUrl}/pricing" class="btn" style="background: #48bb78;">Explore Premium Features</a>
        <a href="mailto:${data.supportEmail}" class="btn" style="background: #718096;">Contact Support</a>
      </div>

      <div class="divider"></div>

      <p><strong>Need help getting started?</strong> Our support team is here to help you make the most of Trade Voyager Analytics. Don't hesitate to reach out!</p>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        Happy Trading!<br>
        <strong>The Trade Voyager Analytics Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>Trade Voyager Analytics</strong></p>
      <p>Professional Trading Analytics & Portfolio Management</p>
      <p>
        <a href="${data.appUrl}">Visit Dashboard</a> •
        <a href="mailto:${data.supportEmail}">Support</a> •
        <a href="${data.appUrl}/pricing">Upgrade to Premium</a>
      </p>
      <p style="font-size: 12px; margin-top: 20px;">
        This email was sent because you created an account with Trade Voyager Analytics.<br>
        You can manage your email preferences in your account settings.
      </p>
    </div>
  `;

  return getEmailTemplate(content, 'Welcome to Trade Voyager Analytics!');
};

/**
 * Generate signup welcome email
 */
export const generateSignupWelcomeEmail = (data: SignupWelcomeEmailData) => ({
  subject: 'Welcome to Trade Voyager Analytics!',
  html: getSignupWelcomeEmailContent(data),
  text: generateSignupWelcomeTextEmail(data)
});

/**
 * Plain text version of signup welcome email
 */
const generateSignupWelcomeTextEmail = (data: SignupWelcomeEmailData): string => {
  return `
Welcome to Trade Voyager Analytics!

Hi ${data.userName}!

Welcome to Trade Voyager Analytics! We're excited to have you join our community of traders who are serious about improving their trading performance.

Your account is now active and you can start using our free features right away.

What you can do with your account:
• Trade logging and notes
• Performance overview
• Access to detailed reports
• View trade breakdowns by individual executions
• Upload CSV files to import trade data
• Upgrade to premium for auto broker sync via Broker Connect

Getting Started:
1. Complete your profile - Add your trading preferences and goals
2. Start logging trades - Record your first trade to see how it works
3. Explore the dashboard - Get familiar with the available tools
4. Check out Premium - See what advanced features are available

Access your dashboard: ${data.appUrl}/dashboard

Ready for More?
When you're ready to take your trading to the next level, check out our Premium features:
• Advanced Analytics: Deep portfolio insights and performance metrics
• Real-time Data: Professional charts and market data
• Enhanced Tools: Advanced journaling and analysis features

Explore Premium: ${data.appUrl}/pricing
Contact support: ${data.supportEmail}

Need help getting started? Our support team is here to help you make the most of Trade Voyager Analytics. Don't hesitate to reach out!

Happy Trading!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Support: ${data.supportEmail}
Upgrade to Premium: ${data.appUrl}/pricing
  `.trim();
};

/**
 * Welcome gift coupon email for existing users
 */
export const getCouponEmailContent = (data: CouponEmailData): string => {
  const content = `
    <div class="header">
      <img src="${data.appUrl}/api/logo" alt="Trade Voyager Analytics Logo" class="logo">
      <h1>🎁 Welcome Gift - Premium Access!</h1>
    </div>

    <div class="content">
      <h2>Hi ${data.userName}!</h2>

      <p>Thank you so much for signing up for Trade Voyager Analytics! As a valued member of our trading community, we wanted to show our appreciation with a special welcome gift.</p>

      <div class="highlight-box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-left: none; border-radius: 8px;">
        <h3 style="margin-top: 0; color: white; font-size: 24px;">🚀 Your Exclusive Coupon Code</h3>
        <div style="background: rgba(255,255,255,0.9); color: #1a202c; padding: 20px; border-radius: 6px; margin: 20px 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
          VOYAGER25
        </div>
        <p style="margin-bottom: 0; font-size: 18px; color: white;">
          <strong>100% OFF Premium Subscription for 1 Full Year!</strong>
        </p>
      </div>

      <p><strong>This is our way of saying thank you for being a valued user!</strong> Your VOYAGER25 coupon gives you complete access to all premium features at no cost for an entire year.</p>

      <div class="benefits">
        <h3 style="margin-top: 0; color: #1a202c;">What you'll get with Premium:</h3>
        <ul>
          <li>Advanced portfolio analytics and performance tracking</li>
          <li>Real-time market data and professional charts</li>
          <li>Unlimited API calls for candlestick charts</li>
          <li>Unlimited daily trade uploads</li>
          <li>Comprehensive trade journaling and analysis</li>
          <li>Auto broker sync via Broker Connect</li>
          <li>Priority customer support</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.appUrl}/pricing?coupon=VOYAGER25" class="btn" style="font-size: 16px; padding: 16px 32px;">Claim Your Free Premium Year</a>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">How to Use Your Coupon:</h3>
      <ol style="font-size: 15px; line-height: 1.6;">
        <li>Click the "Claim Your Free Premium Year" button above</li>
        <li>Select the Premium plan on our pricing page</li>
        <li>Enter coupon code <strong>VOYAGER25</strong> at checkout</li>
        <li>Enjoy a full year of premium features completely free!</li>
      </ol>

      <div style="background-color: #fef5e7; border-left: 4px solid #f6ad55; padding: 16px; margin: 24px 0; border-radius: 0 4px 4px 0;">
        <p style="margin: 0; color: #744210; font-weight: 600;">
          ⏰ <strong>Limited Time Offer:</strong> This coupon is valid for the next 30 days, so be sure to claim it soon!
        </p>
      </div>

      <div class="divider"></div>

      <p><strong>Need help with your upgrade?</strong> Our support team is standing by to assist you with any questions about using your coupon or accessing premium features.</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="mailto:${data.supportEmail}" class="btn" style="background: #718096;">Contact Support</a>
        <a href="${data.appUrl}/dashboard" class="btn" style="background: #48bb78;">Visit Dashboard</a>
      </div>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        Welcome to the premium trading experience!<br>
        <strong>The Trade Voyager Analytics Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>Trade Voyager Analytics</strong></p>
      <p>Professional Trading Analytics & Portfolio Management</p>
      <p>
        <a href="${data.appUrl}">Visit Dashboard</a> •
        <a href="mailto:${data.supportEmail}">Support</a> •
        <a href="${data.appUrl}/pricing">Upgrade to Premium</a>
      </p>
      <p style="font-size: 12px; margin-top: 20px;">
        This email was sent because you have an account with Trade Voyager Analytics.<br>
        Coupon code VOYAGER25 is valid for 30 days from the date of this email.
      </p>
    </div>
  `;

  return getEmailTemplate(content, 'Welcome Gift - Free Premium Access!');
};

/**
 * Generate coupon welcome gift email
 */
export const generateCouponEmail = (data: CouponEmailData) => ({
  subject: 'Welcome Gift: Free Premium Access for 1 Year!',
  html: getCouponEmailContent(data),
  text: generateCouponTextEmail(data)
});

/**
 * Plain text version of coupon email
 */
const generateCouponTextEmail = (data: CouponEmailData): string => {
  return `
Welcome Gift - Free Premium Access for 1 Year!

Hi ${data.userName}!

Thank you so much for signing up for Trade Voyager Analytics! As a valued member of our trading community, we wanted to show our appreciation with a special welcome gift.

🚀 YOUR EXCLUSIVE COUPON CODE: VOYAGER25 🚀
100% OFF Premium Subscription for 1 Full Year!

This is our way of saying thank you for being a valued user! Your VOYAGER25 coupon gives you complete access to all premium features at no cost for an entire year.

What you'll get with Premium:
• Advanced portfolio analytics and performance tracking
• Real-time market data and professional charts
• Unlimited API calls for candlestick charts
• Unlimited daily trade uploads
• Comprehensive trade journaling and analysis
• Auto broker sync via Broker Connect
• Priority customer support

How to Use Your Coupon:
1. Visit our pricing page: ${data.appUrl}/pricing?coupon=VOYAGER25
2. Select the Premium plan
3. Enter coupon code VOYAGER25 at checkout
4. Enjoy a full year of premium features completely free!

⏰ LIMITED TIME OFFER: This coupon is valid for the next 30 days, so be sure to claim it soon!

Claim your free premium year: ${data.appUrl}/pricing?coupon=VOYAGER25
Contact support: ${data.supportEmail}
Visit dashboard: ${data.appUrl}/dashboard

Need help with your upgrade? Our support team is standing by to assist you with any questions about using your coupon or accessing premium features.

Welcome to the premium trading experience!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Support: ${data.supportEmail}
Upgrade to Premium: ${data.appUrl}/pricing
  `.trim();
};

/**
 * Feedback request email for users
 */
export const getFeedbackEmailContent = (data: FeedbackEmailData): string => {
  const content = `
    <div class="header">
      <img src="${data.appUrl}/api/logo" alt="Trade Voyager Analytics Logo" class="logo">
      <h1>We'd Love Your Feedback!</h1>
    </div>

    <div class="content">
      <h2>Hi ${data.userName}!</h2>

      <p>We hope you're enjoying your experience with Trade Voyager Analytics! Your feedback is incredibly valuable to us as we continue to improve our platform.</p>

      <p>We'd be grateful if you could take just a few minutes to share your thoughts about your experience with our application.</p>

      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #1a202c;">What we're asking:</h3>
        <p style="margin-bottom: 0;">
          • A quick 5-question survey (1-10 rating scale)<br>
          • An optional comment to share any additional thoughts<br>
          • Takes less than 3 minutes to complete
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.feedbackUrl}" class="btn" style="font-size: 16px; padding: 16px 32px;">Share Your Feedback</a>
      </div>

      <div class="divider"></div>

      <p>Your honest feedback helps us understand what we're doing well and where we can improve. Every response is read and considered as we work to make Trade Voyager Analytics the best trading analytics platform possible.</p>

      <p><strong>Prefer to respond via email?</strong> Feel free to simply reply to this message with your thoughts. We read every response personally!</p>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        Thank you for being part of our community!<br>
        <strong>The Trade Voyager Analytics Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>Trade Voyager Analytics</strong></p>
      <p>Professional Trading Analytics & Portfolio Management</p>
      <p>
        <a href="${data.appUrl}">Visit Dashboard</a> •
        <a href="mailto:${data.supportEmail}">Contact Support</a>
      </p>
      <p style="font-size: 12px; margin-top: 20px;">
        This email was sent because you have an account with Trade Voyager Analytics.<br>
        You can manage your email preferences in your account settings.
      </p>
    </div>
  `;

  return getEmailTemplate(content, 'We\'d Love Your Feedback!');
};

/**
 * Generate feedback request email
 */
export const generateFeedbackEmail = (data: FeedbackEmailData) => ({
  subject: 'We\'d love your feedback on Trade Voyager Analytics',
  html: getFeedbackEmailContent(data),
  text: generateFeedbackTextEmail(data)
});

/**
 * Plain text version of feedback email
 */
const generateFeedbackTextEmail = (data: FeedbackEmailData): string => {
  return `
We'd Love Your Feedback!

Hi ${data.userName}!

We hope you're enjoying your experience with Trade Voyager Analytics! Your feedback is incredibly valuable to us as we continue to improve our platform.

We'd be grateful if you could take just a few minutes to share your thoughts about your experience with our application.

What we're asking:
• A quick 5-question survey (1-10 rating scale)
• An optional comment to share any additional thoughts
• Takes less than 3 minutes to complete

Share your feedback: ${data.feedbackUrl}

Your honest feedback helps us understand what we're doing well and where we can improve. Every response is read and considered as we work to make Trade Voyager Analytics the best trading analytics platform possible.

Prefer to respond via email? Feel free to simply reply to this message with your thoughts. We read every response personally!

Thank you for being part of our community!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Contact Support: ${data.supportEmail}
  `.trim();
};