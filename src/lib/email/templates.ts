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
  supportEmail: string;
  appUrl: string;
}

export interface OnboardingCheckInEmailData {
  userName: string;
  userEmail: string;
  supportEmail: string;
  appUrl: string;
}

export interface OnboardingWithCouponEmailData {
  userName: string;
  userEmail: string;
  supportEmail: string;
  appUrl: string;
}

export interface FormatDenialEmailData {
  userName: string;
  userEmail: string;
  supportEmail: string;
  appUrl: string;
  denialReason: string;
  denialMessage?: string;
  assetType?: string;
}

export interface DuplicateOrdersEmailData {
  importBatchId: string;
  filename: string;
  userId: string;
  userEmail: string;
  formatName: string;
  brokerName: string;
  duplicates: Array<{
    stagingId: string;
    existingOrderId: string;
    symbol: string;
    executedTime: string;
  }>;
  timestamp: string;
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
        <a href="${data.appUrl}/feedback" class="btn" style="font-size: 16px; padding: 16px 32px;">Share Your Feedback</a>
      </div>

      <div class="divider"></div>

      <p>Your honest feedback helps us understand what we're doing well and where we can improve. Every response is read and considered as we work to make Trade Voyager Analytics the best trading analytics platform possible.</p>

      <p><strong>Prefer to respond via email?</strong> Feel free to simply reply to this message with your thoughts. We read every response personally!</p>

      <p style="margin-top: 24px;">You can also reach us anytime through our <a href="${data.appUrl}/contact" style="color: #667eea; text-decoration: none; font-weight: 600;">contact form</a>.</p>

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

Share your feedback: ${data.appUrl}/feedback

Your honest feedback helps us understand what we're doing well and where we can improve. Every response is read and considered as we work to make Trade Voyager Analytics the best trading analytics platform possible.

Prefer to respond via email? Feel free to simply reply to this message with your thoughts. We read every response personally!

You can also reach us anytime through our contact form: ${data.appUrl}/contact

Thank you for being part of our community!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Contact Support: ${data.supportEmail}
  `.trim();
};

/**
 * Onboarding check-in email for users who haven't uploaded trades yet
 */
export const getOnboardingCheckInEmailContent = (data: OnboardingCheckInEmailData): string => {
  const content = `
    <div class="header">
      <img src="${data.appUrl}/api/logo" alt="Trade Voyager Analytics Logo" class="logo">
      <h1>Need Help Getting Started?</h1>
    </div>

    <div class="content">
      <h2>Hi ${data.userName}!</h2>

      <p>Thanks for signing up for Trade Voyager Analytics! We're excited to have you join our community of traders.</p>

      <p>We wanted to reach out to check in and see if you have any questions about making your first upload so you can start harnessing the power of our analytics and heighten your trading game.</p>

      <div class="benefits">
        <h3 style="margin-top: 0; color: #1a202c;">Here's what you can do once you upload your trades:</h3>
        <ul>
          <li>Track your performance with detailed analytics and visualizations</li>
          <li>Identify patterns in your winning and losing trades</li>
          <li>Analyze your trading behavior across different timeframes</li>
          <li>Set goals and monitor your progress over time</li>
          <li>Make data-driven decisions to improve your trading results</li>
        </ul>
      </div>

      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #1a202c;">Getting Your Trades Uploaded:</h3>
        <p style="margin-bottom: 0;">
          <strong>Option 1: Upload CSV File</strong><br>
          1. <strong>Export your trade data</strong> from your broker (CSV format)<br>
          2. <strong>Visit your dashboard</strong> and click on "Import Trades"<br>
          3. <strong>Upload your CSV file</strong> and let our system process it<br>
          4. <strong>Start analyzing</strong> your trading performance immediately
        </p>
        <p style="margin: 16px 0; text-align: center; font-weight: 600; color: #667eea;">— OR —</p>
        <p style="margin-bottom: 0;">
          <strong>Option 2: Automatic Broker Sync</strong><br>
          1. <strong>Upgrade to Premium</strong> to access Broker Connect<br>
          2. <strong>Connect your brokerage account</strong> for automatic trade syncing<br>
          3. <strong>Enjoy hands-free</strong> trade tracking with real-time updates<br>
          <a href="${data.appUrl}/pricing" style="color: #667eea; text-decoration: none; font-weight: 600;">Learn more about Premium features →</a>
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.appUrl}/dashboard" class="btn" style="font-size: 16px; padding: 16px 32px;">Go to Dashboard</a>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">Have Questions? We're Here to Help!</h3>
      <p><strong>Just reply directly to this email to start a conversation with one of our support staff.</strong> We're here to support you in getting up and running with Trade Voyager Analytics.</p>

      <p>Whether you need help with:</p>
      <ul style="font-size: 15px; line-height: 1.6;">
        <li>Exporting data from your broker</li>
        <li>Understanding the analytics and reports</li>
        <li>Navigating the platform features</li>
      </ul>

      <p>We're ready to assist you every step of the way!</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="mailto:${data.supportEmail}" class="btn" style="background: #48bb78;">Contact Support</a>
      </div>

      <div class="divider"></div>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        Thanks for taking the time to join us. We look forward to helping you elevate your trading!<br>
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

  return getEmailTemplate(content, 'Need Help Getting Started?');
};

/**
 * Generate onboarding check-in email
 */
export const generateOnboardingCheckInEmail = (data: OnboardingCheckInEmailData) => ({
  subject: 'Need help getting started with Trade Voyager Analytics?',
  html: getOnboardingCheckInEmailContent(data),
  text: generateOnboardingCheckInTextEmail(data)
});

/**
 * Plain text version of onboarding check-in email
 */
const generateOnboardingCheckInTextEmail = (data: OnboardingCheckInEmailData): string => {
  return `
Need Help Getting Started?

Hi ${data.userName}!

Thanks for signing up for Trade Voyager Analytics! We're excited to have you join our community of traders.

We wanted to reach out to check in and see if you have any questions about making your first upload so you can start harnessing the power of our analytics and heighten your trading game.

Here's what you can do once you upload your trades:
• Track your performance with detailed analytics and visualizations
• Identify patterns in your winning and losing trades
• Analyze your trading behavior across different timeframes
• Set goals and monitor your progress over time
• Make data-driven decisions to improve your trading results

Getting Your Trades Uploaded:

Option 1: Upload CSV File
1. Export your trade data from your broker (CSV format)
2. Visit your dashboard and click on "Import Trades"
3. Upload your CSV file and let our system process it
4. Start analyzing your trading performance immediately

— OR —

Option 2: Automatic Broker Sync
1. Upgrade to Premium to access Broker Connect
2. Connect your brokerage account for automatic trade syncing
3. Enjoy hands-free trade tracking with real-time updates
Learn more about Premium features: ${data.appUrl}/pricing

Go to your dashboard: ${data.appUrl}/dashboard

Have Questions? We're Here to Help!

Just reply directly to this email to start a conversation with one of our support staff. We're here to support you in getting up and running with Trade Voyager Analytics.

Whether you need help with:
• Exporting data from your broker
• Understanding the analytics and reports
• Navigating the platform features

We're ready to assist you every step of the way!

Contact support: ${data.supportEmail}

Thanks for taking the time to join us. We look forward to helping you elevate your trading!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Contact Support: ${data.supportEmail}
  `.trim();
};

/**
 * Onboarding check-in email with VOYAGER25 coupon for users who haven't uploaded trades yet
 */
export const getOnboardingWithCouponEmailContent = (data: OnboardingWithCouponEmailData): string => {
  const content = `
    <div class="header">
      <img src="${data.appUrl}/api/logo" alt="Trade Voyager Analytics Logo" class="logo">
      <h1>🎁 Welcome Gift + Getting Started Help</h1>
    </div>

    <div class="content">
      <h2>Hi ${data.userName}!</h2>

      <p>Thanks for signing up for Trade Voyager Analytics! We're excited to have you join our community of traders.</p>

      <p>We wanted to reach out to check in and see if you have any questions about getting started. Plus, we have a special thank you gift for you!</p>

      <div class="highlight-box" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 30px; border-left: none; border-radius: 8px;">
        <h3 style="margin-top: 0; color: white; font-size: 24px;">🚀 Your Exclusive Welcome Gift</h3>
        <div style="background: rgba(255,255,255,0.9); color: #1a202c; padding: 20px; border-radius: 6px; margin: 20px 0; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
          VOYAGER25
        </div>
        <p style="margin-bottom: 0; font-size: 18px; color: white;">
          <strong>100% OFF Premium Subscription for 1 Full Year!</strong>
        </p>
      </div>

      <p><strong>This is our way of saying thank you for joining us!</strong> Your VOYAGER25 coupon gives you complete access to all premium features at no cost for an entire year.</p>

      <div class="benefits">
        <h3 style="margin-top: 0; color: #1a202c;">What you can do with Premium once you upload your trades:</h3>
        <ul>
          <li>Track your performance with advanced analytics and visualizations</li>
          <li>Unlimited API calls for candlestick charts in your trade records</li>
          <li>Unlimited daily trade uploads</li>
          <li>Auto broker sync via Broker Connect for hands-free tracking</li>
          <li>Priority customer support</li>
        </ul>
      </div>

      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #1a202c;">Getting Your Trades Uploaded:</h3>
        <p style="margin-bottom: 0;">
          <strong>Option 1: Upload CSV File (Free Tier)</strong><br>
          1. <strong>Export your trade data</strong> from your broker (CSV format)<br>
          2. <strong>Visit your dashboard</strong> and click on "Import Trades"<br>
          3. <strong>Upload your CSV file</strong> and let our system process it<br>
          4. <strong>Start analyzing</strong> your trading performance immediately
        </p>
        <p style="margin: 16px 0; text-align: center; font-weight: 600; color: #667eea;">— OR —</p>
        <p style="margin-bottom: 0;">
          <strong>Option 2: Automatic Broker Sync (Premium)</strong><br>
          1. <strong>Claim your VOYAGER25 coupon</strong> for free Premium access<br>
          2. <strong>Connect your brokerage account</strong> for automatic trade syncing<br>
          3. <strong>Enjoy hands-free</strong> trade tracking with real-time updates<br>
          <a href="${data.appUrl}/pricing?coupon=VOYAGER25" style="color: #667eea; text-decoration: none; font-weight: 600;">Claim your free Premium year →</a>
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.appUrl}/pricing?coupon=VOYAGER25" class="btn" style="font-size: 16px; padding: 16px 32px; background: #48bb78;">Claim Free Premium Year</a>
        <a href="${data.appUrl}/dashboard" class="btn" style="font-size: 16px; padding: 16px 32px;">Go to Dashboard</a>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">How to Use Your VOYAGER25 Coupon:</h3>
      <ol style="font-size: 15px; line-height: 1.6;">
        <li>Click the "Claim Free Premium Year" button above</li>
        <li>Select the Premium plan on our pricing page</li>
        <li>Enter coupon code <strong>VOYAGER25</strong> at checkout</li>
        <li>Enjoy a full year of premium features completely free!</li>
      </ol>

      <div style="background-color: #fef5e7; border-left: 4px solid #f6ad55; padding: 16px; margin: 24px 0; border-radius: 0 4px 4px 0;">
        <p style="margin: 0; color: #744210; font-weight: 600;">
          ⏰ <strong>Limited Time Offer:</strong> This coupon is valid for 30 days, so be sure to claim it soon!
        </p>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">Have Questions? We're Here to Help!</h3>
      <p><strong>Just reply directly to this email to start a conversation with one of our support staff.</strong> We're here to support you in getting up and running with Trade Voyager Analytics.</p>

      <p>Whether you need help with:</p>
      <ul style="font-size: 15px; line-height: 1.6;">
        <li>Exporting data from your broker</li>
        <li>Using your VOYAGER25 coupon</li>
        <li>Setting up Broker Connect</li>
        <li>Understanding the analytics and reports</li>
      </ul>

      <p>We're ready to assist you every step of the way!</p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="mailto:${data.supportEmail}" class="btn" style="background: #667eea;">Contact Support</a>
      </div>

      <div class="divider"></div>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        Thanks for taking the time to join us. We look forward to helping you elevate your trading!<br>
        <strong>The Trade Voyager Analytics Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>Trade Voyager Analytics</strong></p>
      <p>Professional Trading Analytics & Portfolio Management</p>
      <p>
        <a href="${data.appUrl}">Visit Dashboard</a> •
        <a href="mailto:${data.supportEmail}">Contact Support</a> •
        <a href="${data.appUrl}/pricing?coupon=VOYAGER25">Claim Your Coupon</a>
      </p>
      <p style="font-size: 12px; margin-top: 20px;">
        This email was sent because you have an account with Trade Voyager Analytics.<br>
        Coupon code VOYAGER25 is valid for 30 days from the date of this email.
      </p>
    </div>
  `;

  return getEmailTemplate(content, 'Welcome Gift + Getting Started Help');
};

/**
 * Generate onboarding check-in email with coupon
 */
export const generateOnboardingWithCouponEmail = (data: OnboardingWithCouponEmailData) => ({
  subject: 'Welcome Gift: Free Premium Year + Getting Started Help',
  html: getOnboardingWithCouponEmailContent(data),
  text: generateOnboardingWithCouponTextEmail(data)
});

/**
 * Plain text version of onboarding check-in email with coupon
 */
const generateOnboardingWithCouponTextEmail = (data: OnboardingWithCouponEmailData): string => {
  return `
Welcome Gift + Getting Started Help

Hi ${data.userName}!

Thanks for signing up for Trade Voyager Analytics! We're excited to have you join our community of traders.

We wanted to reach out to check in and see if you have any questions about getting started. Plus, we have a special thank you gift for you!

🚀 YOUR EXCLUSIVE WELCOME GIFT: VOYAGER25 🚀
100% OFF Premium Subscription for 1 Full Year!

This is our way of saying thank you for joining us! Your VOYAGER25 coupon gives you complete access to all premium features at no cost for an entire year.

What you can do with Premium once you upload your trades:
• Track your performance with advanced analytics and visualizations
• Unlimited API calls for candlestick charts in your trade records
• Unlimited daily trade uploads
• Auto broker sync via Broker Connect for hands-free tracking
• Priority customer support

Getting Your Trades Uploaded:

Option 1: Upload CSV File (Free Tier)
1. Export your trade data from your broker (CSV format)
2. Visit your dashboard and click on "Import Trades"
3. Upload your CSV file and let our system process it
4. Start analyzing your trading performance immediately

— OR —

Option 2: Automatic Broker Sync (Premium)
1. Claim your VOYAGER25 coupon for free Premium access
2. Connect your brokerage account for automatic trade syncing
3. Enjoy hands-free trade tracking with real-time updates
Claim your free Premium year: ${data.appUrl}/pricing?coupon=VOYAGER25

How to Use Your VOYAGER25 Coupon:
1. Click the link above or visit our pricing page
2. Select the Premium plan
3. Enter coupon code VOYAGER25 at checkout
4. Enjoy a full year of premium features completely free!

⏰ LIMITED TIME OFFER: This coupon is valid for 30 days, so be sure to claim it soon!

Have Questions? We're Here to Help!

Just reply directly to this email to start a conversation with one of our support staff. We're here to support you in getting up and running with Trade Voyager Analytics.

Whether you need help with:
• Exporting data from your broker
• Using your VOYAGER25 coupon
• Setting up Broker Connect
• Understanding the analytics and reports

We're ready to assist you every step of the way!

Claim free Premium year: ${data.appUrl}/pricing?coupon=VOYAGER25
Go to your dashboard: ${data.appUrl}/dashboard
Contact support: ${data.supportEmail}

Thanks for taking the time to join us. We look forward to helping you elevate your trading!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Contact Support: ${data.supportEmail}
Claim Your Coupon: ${data.appUrl}/pricing?coupon=VOYAGER25
  `.trim();
};

/**
 * Get CSV format examples based on asset type
 */
const getCsvFormatExamples = (assetType: string) => {
  const examples: Record<string, { description: string; header: string; sample: string }> = {
    Stock: {
      description: 'Stock Trades',
      header: 'Date,Symbol,Side,Quantity,Price,Commission,Total',
      sample: '2024-01-15,AAPL,BUY,100,185.50,1.00,18551.00'
    },
    Option: {
      description: 'Option Trades',
      header: 'Date,Symbol,Option Type,Strike,Expiration,Side,Contracts,Price,Commission,Total',
      sample: '2024-01-15,AAPL,CALL,190,2024-02-16,BUY,1,5.25,0.65,525.65'
    },
    Forex: {
      description: 'Forex Trades',
      header: 'Date/Time,Currency Pair,Side,Units,Entry Price,Exit Price,Commission,P/L',
      sample: '2024-01-15 09:30:00,EUR/USD,BUY,10000,1.0850,1.0875,2.50,247.50'
    },
    Futures: {
      description: 'Futures Trades',
      header: 'Date,Contract,Expiration,Side,Contracts,Entry Price,Exit Price,Commission,P/L',
      sample: '2024-01-15,ES,2024-03-15,LONG,2,4750.00,4765.50,4.80,1545.20'
    },
    Crypto: {
      description: 'Crypto Trades',
      header: 'Date/Time,Pair,Side,Amount,Price,Fee,Total',
      sample: '2024-01-15 14:22:33,BTC/USD,BUY,0.05,45000.00,11.25,2261.25'
    }
  };
  return examples[assetType];
};

/**
 * Format denial email for CSV uploads that cannot be supported
 */
export const getFormatDenialEmailContent = (data: FormatDenialEmailData): string => {
  const content = `
    <div class="header">
      <img src="${data.appUrl}/api/logo" alt="Trade Voyager Analytics Logo" class="logo">
      <h1>CSV Format Review Update</h1>
    </div>

    <div class="content">
      <h2>Hi ${data.userName},</h2>

      <p>Thank you for uploading your trade data to Trade Voyager Analytics. We appreciate you taking the time to share your trading information with our platform.</p>

      <p>Unfortunately, after careful review by our admin team, we've determined that the CSV format you submitted is not one we can currently support for automatic processing.</p>

      <div class="highlight-box" style="background-color: #fef5e7; border-left: 4px solid #f6ad55;">
        <h3 style="margin-top: 0; color: #744210;">Reason for Format Denial:</h3>
        <p style="margin-bottom: 0; color: #744210; font-weight: 600;">
          ${data.denialReason}
        </p>
      </div>

      ${data.denialMessage ? `
      <div class="highlight-box">
        <h3 style="margin-top: 0; color: #1a202c;">Additional Details from Our Team:</h3>
        <p style="margin-bottom: 0; white-space: pre-wrap;">
          ${data.denialMessage}
        </p>
      </div>
      ` : ''}

      ${data.assetType ? `
      <div class="highlight-box" style="background-color: #f0f9ff; border-left: 4px solid #3b82f6;">
        <h3 style="margin-top: 0; color: #1e40af;">Example CSV Format for ${data.assetType} Orders:</h3>
        <p style="margin-bottom: 12px;">To help you understand what we're looking for, here's an example of what a valid ${data.assetType.toLowerCase()} order execution CSV file might look like:</p>

        <div style="background-color: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 13px; overflow-x: auto; margin: 12px 0;">
          <div style="color: #94a3b8; margin-bottom: 8px;">Sample Header Row:</div>
          <div style="color: #60a5fa; margin-bottom: 12px;">${getCsvFormatExamples(data.assetType).header}</div>

          <div style="color: #94a3b8; margin-bottom: 8px;">Sample Data Row:</div>
          <div style="color: #86efac;">${getCsvFormatExamples(data.assetType).sample}</div>
        </div>

        <p style="margin-top: 12px; margin-bottom: 0; font-size: 14px; color: #475569;">
          <strong>Note:</strong> This is just one example format. Your broker's CSV may have different column names or ordering, but it should contain similar transaction data including dates, symbols, quantities, prices, and fees for executed orders.
        </p>
      </div>
      ` : ''}

      <div class="divider"></div>

      <h3 style="color: #1a202c;">We're Here to Help!</h3>
      <p><strong>Please don't hesitate to reach out if you have any questions or need assistance.</strong> Our support team is ready to help you find alternative ways to import your trade data or discuss potential solutions.</p>

      <div class="benefits">
        <h3 style="margin-top: 0; color: #1a202c;">You can contact us through:</h3>
        <ul>
          <li><strong>Reply to this email</strong> - We'll respond personally to your questions</li>
          <li><strong>Visit our contact page</strong> - Submit a support request with additional details</li>
          <li><strong>Email our support team</strong> - Direct line to our technical support staff</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.appUrl}/contact" class="btn" style="font-size: 16px; padding: 16px 32px;">Contact Support</a>
        <a href="mailto:${data.supportEmail}" class="btn" style="background: #667eea;">Email Us Directly</a>
      </div>

      <div class="divider"></div>

      <p>We understand this may be disappointing, and we genuinely value your interest in using Trade Voyager Analytics. Our goal is to provide the best possible trading analytics experience, and sometimes that means we need to ensure data quality and compatibility.</p>

      <p><strong>We're committed to helping you succeed.</strong> Whether you need guidance on exporting data in a different format, or you'd like to explore other import options, we're here to support you every step of the way.</p>

      <p style="margin-top: 24px;">Thank you for your understanding, and we hope you continue to find value in using Trade Voyager Analytics for your trading journey.</p>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        We're here whenever you need us!<br>
        <strong>The Trade Voyager Analytics Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>Trade Voyager Analytics</strong></p>
      <p>Professional Trading Analytics & Portfolio Management</p>
      <p>
        <a href="${data.appUrl}">Visit Dashboard</a> •
        <a href="mailto:${data.supportEmail}">Support</a> •
        <a href="${data.appUrl}/contact">Contact Us</a>
      </p>
      <p style="font-size: 12px; margin-top: 20px;">
        This email was sent regarding your CSV upload to Trade Voyager Analytics.<br>
        If you have any questions, please don't hesitate to reach out to our support team.
      </p>
    </div>
  `;

  return getEmailTemplate(content, 'CSV Format Review Update');
};

/**
 * Generate format denial email
 */
export const generateFormatDenialEmail = (data: FormatDenialEmailData) => ({
  subject: 'CSV Format Review Update - Trade Voyager Analytics',
  html: getFormatDenialEmailContent(data),
  text: generateFormatDenialTextEmail(data)
});

/**
 * Plain text version of format denial email
 */
const generateFormatDenialTextEmail = (data: FormatDenialEmailData): string => {
  return `
CSV Format Review Update - Trade Voyager Analytics

Hi ${data.userName},

Thank you for uploading your trade data to Trade Voyager Analytics. We appreciate you taking the time to share your trading information with our platform.

Unfortunately, after careful review by our admin team, we've determined that the CSV format you submitted is not one we can currently support for automatic processing.

REASON FOR FORMAT DENIAL:
${data.denialReason}

${data.denialMessage ? `
ADDITIONAL DETAILS FROM OUR TEAM:
${data.denialMessage}
` : ''}

${data.assetType ? `
EXAMPLE CSV FORMAT FOR ${data.assetType.toUpperCase()} ORDERS:

To help you understand what we're looking for, here's an example of what a valid ${data.assetType.toLowerCase()} order execution CSV file might look like:

Sample Header Row:
${getCsvFormatExamples(data.assetType).header}

Sample Data Row:
${getCsvFormatExamples(data.assetType).sample}

Note: This is just one example format. Your broker's CSV may have different column names or ordering, but it should contain similar transaction data including dates, symbols, quantities, prices, and fees for executed orders.

` : ''}
We're Here to Help!

Please don't hesitate to reach out if you have any questions or need assistance. Our support team is ready to help you find alternative ways to import your trade data or discuss potential solutions.

You can contact us through:
• Reply to this email - We'll respond personally to your questions
• Visit our contact page - Submit a support request with additional details: ${data.appUrl}/contact
• Email our support team - Direct line to our technical support staff: ${data.supportEmail}

We understand this may be disappointing, and we genuinely value your interest in using Trade Voyager Analytics. Our goal is to provide the best possible trading analytics experience, and sometimes that means we need to ensure data quality and compatibility.

We're committed to helping you succeed. Whether you need guidance on exporting data in a different format, or you'd like to explore other import options, we're here to support you every step of the way.

Thank you for your understanding, and we hope you continue to find value in using Trade Voyager Analytics for your trading journey.

We're here whenever you need us!
The Trade Voyager Analytics Team

---
Trade Voyager Analytics
Professional Trading Analytics & Portfolio Management

Dashboard: ${data.appUrl}
Support: ${data.supportEmail}
Contact Us: ${data.appUrl}/contact
  `.trim();
};

/**
 * Admin notification email for duplicate orders detected during migration
 */
export const getDuplicateOrdersEmailContent = (data: DuplicateOrdersEmailData): string => {
  const duplicateList = data.duplicates.map((dup, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 13px;">${dup.stagingId}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 13px;">${dup.existingOrderId}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600;">${dup.symbol}</td>
      <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 13px;">${new Date(dup.executedTime).toLocaleString()}</td>
    </tr>
  `).join('');

  const content = `
    <div class="header">
      <h1>⚠️ Duplicate Orders Detected</h1>
    </div>

    <div class="content">
      <h2>Admin Alert: Order Migration Duplicates</h2>

      <p>Duplicate orders were detected during the migration process from staging to the orders table. These records were not migrated to prevent data duplication.</p>

      <div class="highlight-box" style="background-color: #fef5e7; border-left: 4px solid #f59e0b;">
        <h3 style="margin-top: 0; color: #92400e;">Upload Details:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; width: 140px;">Import Batch:</td>
            <td style="padding: 8px 0; font-family: monospace;">${data.importBatchId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Filename:</td>
            <td style="padding: 8px 0;">${data.filename}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">User ID:</td>
            <td style="padding: 8px 0; font-family: monospace;">${data.userId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">User Email:</td>
            <td style="padding: 8px 0;">${data.userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">CSV Format:</td>
            <td style="padding: 8px 0;">${data.formatName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Broker:</td>
            <td style="padding: 8px 0;">${data.brokerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600;">Timestamp:</td>
            <td style="padding: 8px 0;">${data.timestamp}</td>
          </tr>
        </table>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">Duplicate Orders Found: ${data.duplicates.length}</h3>

      <p>The following staging records matched existing orders in the database and were marked as FAILED:</p>

      <div style="overflow-x: auto; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background-color: #1e293b; color: #ffffff;">
              <th style="padding: 12px; text-align: left; font-weight: 600;">Staging ID</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Existing Order ID</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Symbol</th>
              <th style="padding: 12px; text-align: left; font-weight: 600;">Execution Time</th>
            </tr>
          </thead>
          <tbody>
            ${duplicateList}
          </tbody>
        </table>
      </div>

      <div class="highlight-box" style="background-color: #eff6ff; border-left: 4px solid #3b82f6;">
        <h3 style="margin-top: 0; color: #1e40af;">Duplicate Detection Logic:</h3>
        <p style="margin-bottom: 0;">
          Orders were identified as duplicates based on matching:<br>
          • <strong>User ID</strong><br>
          • <strong>Symbol</strong><br>
          • <strong>Execution Time</strong><br>
          • <strong>Broker ID</strong>
        </p>
      </div>

      <div class="divider"></div>

      <h3 style="color: #1a202c;">Recommended Actions:</h3>
      <ul>
        <li>Review the staging records to verify they are indeed duplicates</li>
        <li>Check if the user needs to be notified about the duplicate entries</li>
        <li>Investigate if this indicates a data quality issue with the CSV format</li>
        <li>Consider if the format approval should be reviewed</li>
      </ul>

      <p style="font-style: italic; color: #718096; margin-top: 30px;">
        This is an automated notification from the Trade Voyager Analytics migration system.<br>
        <strong>Admin Team</strong>
      </p>
    </div>

    <div class="footer">
      <p><strong>Trade Voyager Analytics - Admin Notification</strong></p>
      <p>Order Migration Duplicate Detection System</p>
      <p style="font-size: 12px; margin-top: 20px;">
        This email was automatically generated during the order migration process.
      </p>
    </div>
  `;

  return getEmailTemplate(content, 'Duplicate Orders Detected During Migration');
};

/**
 * Generate duplicate orders admin notification email
 */
export const generateDuplicateOrdersEmail = (data: DuplicateOrdersEmailData) => ({
  subject: `⚠️ Duplicate Orders Detected - ${data.formatName} (${data.duplicates.length} duplicates)`,
  html: getDuplicateOrdersEmailContent(data),
  text: generateDuplicateOrdersTextEmail(data)
});

/**
 * Plain text version of duplicate orders email
 */
const generateDuplicateOrdersTextEmail = (data: DuplicateOrdersEmailData): string => {
  const duplicateList = data.duplicates.map((dup, index) =>
    `${index + 1}. Staging ID: ${dup.stagingId} → Existing Order ID: ${dup.existingOrderId}\n   Symbol: ${dup.symbol}, Execution Time: ${new Date(dup.executedTime).toLocaleString()}`
  ).join('\n\n');

  return `
⚠️ DUPLICATE ORDERS DETECTED DURING MIGRATION

Admin Alert: Order Migration Duplicates

Duplicate orders were detected during the migration process from staging to the orders table. These records were not migrated to prevent data duplication.

UPLOAD DETAILS:
Import Batch: ${data.importBatchId}
Filename: ${data.filename}
User ID: ${data.userId}
User Email: ${data.userEmail}
CSV Format: ${data.formatName}
Broker: ${data.brokerName}
Timestamp: ${data.timestamp}

DUPLICATE ORDERS FOUND: ${data.duplicates.length}

The following staging records matched existing orders in the database and were marked as FAILED:

${duplicateList}

DUPLICATE DETECTION LOGIC:
Orders were identified as duplicates based on matching:
• User ID
• Symbol
• Execution Time
• Broker ID

RECOMMENDED ACTIONS:
• Review the staging records to verify they are indeed duplicates
• Check if the user needs to be notified about the duplicate entries
• Investigate if this indicates a data quality issue with the CSV format
• Consider if the format approval should be reviewed

---
This is an automated notification from the Trade Voyager Analytics migration system.

Trade Voyager Analytics - Admin Notification
Order Migration Duplicate Detection System
  `.trim();
};