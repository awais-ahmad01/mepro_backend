// utils/emailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// OTP Email Template
const generateOTPEmailHTML = (otp, userName = "User") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Verification Code</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #f8f9fa;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #4f46e5;
          color: white;
          border-radius: 8px 8px 0 0;
        }
        
        .header h1 {
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .greeting {
          margin-bottom: 20px;
          color: #333;
        }
        
        .otp-container {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 25px 0;
          border: 2px dashed #d1d5db;
        }
        
        .otp-code {
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          color: #4f46e5;
          margin: 10px 0;
          font-family: 'Monaco', 'Courier New', monospace;
        }
        
        .instruction {
          color: #666;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        
        .note {
          background-color: #fff7ed;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        
        .note p {
          margin: 5px 0;
          color: #92400e;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        
        .warning {
          color: #dc2626;
          font-weight: bold;
          margin-top: 10px;
        }
        
        @media (max-width: 600px) {
          .email-container {
            padding: 10px;
          }
          
          .content {
            padding: 20px;
          }
          
          .otp-code {
            font-size: 28px;
            letter-spacing: 6px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Mepro Merchant Verification</h1>
          <p>Secure your account</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <h2>Hello ${userName},</h2>
            <p>Thank you for registering with Mepro! Please use the verification code below to complete your merchant account setup.</p>
          </div>
          
          <div class="instruction">
            <p>Enter this verification code in the Mepro app to verify your email address:</p>
          </div>
          
          <div class="otp-container">
            <p style="color: #6b7280; margin-bottom: 10px;">Your verification code:</p>
            <div class="otp-code">${otp}</div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 10px;">This code expires in 10 minutes</p>
          </div>
          
          <div class="instruction">
            <p>If you didn't request this code, please ignore this email or contact our support team if you have concerns.</p>
          </div>
          
          <div class="note">
            <p><strong>Important:</strong></p>
            <p>• Never share this code with anyone</p>
            <p>• Mepro will never ask for your verification code</p>
            <p>• Delete this email after verification</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Mepro. All rights reserved.</p>
            <p class="warning">For security reasons, do not forward this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Welcome Email Template (for after password setup)
const generateWelcomeEmailHTML = (userName = "Merchant") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Mepro!</title>
      <style>
        /* Similar styling as above, customize as needed */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #f8f9fa;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #10b981;
          color: white;
          border-radius: 8px 8px 0 0;
        }
        
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .greeting {
          margin-bottom: 20px;
          color: #333;
        }
        
        .welcome-icon {
          text-align: center;
          font-size: 48px;
          margin: 20px 0;
          color: #10b981;
        }
        
        .next-steps {
          background-color: #f0fdf4;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        
        .next-steps h3 {
          color: #065f46;
          margin-bottom: 10px;
        }
        
        .next-steps ul {
          padding-left: 20px;
          color: #047857;
        }
        
        .next-steps li {
          margin-bottom: 8px;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Welcome to Mepro!</h1>
          <p>Your Merchant Journey Begins</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            <h2>Hello ${userName},</h2>
            <p>Congratulations! Your merchant account has been created successfully.</p>
          </div>
          
          <div class="welcome-icon">
            🎉
          </div>
          
          <p>We're excited to have you join the Mepro platform. Your account is currently pending admin approval.</p>
          
          <div class="next-steps">
            <h3>What's Next?</h3>
            <ul>
              <li>Complete your business profile details</li>
              <li>Set up your services and loyalty program</li>
              <li>Wait for admin approval (usually within 24-48 hours)</li>
              <li>Start engaging with customers once approved</li>
            </ul>
          </div>
          
          <p>You can now log in to your merchant dashboard to complete your business profile setup.</p>
          
          <p><strong>Need Help?</strong><br>
          Visit our <a href="https://help.mepro.com">Help Center</a> or contact our support team.</p>
          
          <div class="footer">
            <p>Best regards,<br>The Mepro Team</p>
            <p>© ${new Date().getFullYear()} Mepro. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Password Reset Email Template
const generatePasswordResetEmailHTML = (resetUrl, userName = "Merchant") => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Mepro Password</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: 'Arial', sans-serif;
        }

        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #f8f9fa;
          padding: 20px;
        }

        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #4f46e5;
          color: white;
          border-radius: 8px 8px 0 0;
        }

        .content {
          background-color: white;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .greeting {
          margin-bottom: 20px;
          color: #333;
        }

        .cta-button {
          display: inline-block;
          margin: 20px 0;
          padding: 12px 24px;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          border-radius: 999px;
          font-weight: bold;
        }

        .note {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
          color: #92400e;
        }

        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>

        <div class="content">
          <div class="greeting">
            <h2>Hello ${userName},</h2>
            <p>We received a request to reset the password for your Mepro merchant account.</p>
          </div>

          <p>To reset your password, click the button below. This link will expire in 1 hour for your security.</p>

          <p style="text-align: center;">
            <a href="${resetUrl}" class="cta-button">Reset Password</a>
          </p>

          <p>If the button above does not work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb; margin: 10px 0;">${resetUrl}</p>

          <div class="note">
            <p><strong>Important security tips:</strong></p>
            <p>• This link is valid for one use only and will expire in 1 hour.</p>
            <p>• If you did not request a password reset, you can safely ignore this email.</p>
            <p>• Never share this link or your new password with anyone.</p>
          </div>

          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Mepro. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email sending functions
export const sendOTPEmail = async (email, otp, userName = null) => {
  try {
    const subject = "Your Mepro Verification Code";
    const text = `Your Mepro verification code is: ${otp}. This code expires in 10 minutes.`;
    const html = generateOTPEmailHTML(otp, userName || email.split('@')[0]);
    
    const info = await transporter.sendMail({
      from: `"Mepro" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      text,
      html,
    });

    console.log("✅ OTP email sent to:", email, "Message ID:", info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      email: email
    };
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

export const sendWelcomeEmail = async (email, userName = null) => {
  try {
    const subject = "Welcome to Mepro - Your Merchant Account is Ready!";
    const text = `Welcome to Mepro! Your merchant account has been created successfully. Please complete your business profile setup.`;
    const html = generateWelcomeEmailHTML(userName || email.split('@')[0]);
    
    const info = await transporter.sendMail({
      from: `"Mepro" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      text,
      html,
    });

    console.log("✅ Welcome email sent to:", email, "Message ID:", info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      email: email
    };
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
};

export const sendAdminApprovalEmail = async (email, approved = true, reason = null) => {
  try {
    const subject = approved 
      ? "Your Mepro Merchant Account Has Been Approved!" 
      : "Update on Your Mepro Merchant Application";
    
    const text = approved
      ? "Congratulations! Your merchant account has been approved. You can now access all merchant features."
      : `Your merchant application requires attention: ${reason || "Please check your dashboard for details."}`;
    
    const html = approved
      ? generateApprovalEmailHTML(email.split('@')[0])
      : generateRejectionEmailHTML(email.split('@')[0], reason);
    
    const info = await transporter.sendMail({
      from: `"Mepro Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      text,
      html,
    });

    console.log("✅ Admin approval email sent to:", email);
    return {
      success: true,
      messageId: info.messageId,
      email: email
    };
  } catch (error) {
    console.error("❌ Error sending admin approval email:", error);
    throw error;
  }
};

// Password reset email
export const sendPasswordResetEmail = async (email, resetUrl, userName = null) => {
  try {
    const subject = "Mepro Password Reset Instructions";
    const text = `You requested a password reset for your Mepro merchant account. 
To reset your password, open the following link in your browser:\n\n${resetUrl}\n\n
This link expires in 1 hour. If you did not request this, you can ignore this email.`;
    const html = generatePasswordResetEmailHTML(resetUrl, userName || email.split('@')[0]);

    const info = await transporter.sendMail({
      from: `"Mepro" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      text,
      html
    });

    console.log("✅ Password reset email sent to:", email, "Message ID:", info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      email
    };
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};

// Generate approval/rejection email HTML templates (simplified for brevity)
const generateApprovalEmailHTML = (userName) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #10b981; color: white; padding: 20px; text-align: center;">
      <h1>Account Approved! 🎉</h1>
    </div>
    <div style="padding: 30px; background: white;">
      <h2>Hello ${userName},</h2>
      <p>Great news! Your Mepro merchant account has been approved by our admin team.</p>
      <p>You can now:</p>
      <ul>
        <li>Access your full merchant dashboard</li>
        <li>Start accepting customer bookings</li>
        <li>Set up loyalty programs</li>
        <li>Manage your business services</li>
      </ul>
      <p><a href="${process.env.APP_URL}/merchant/login" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Login to Dashboard</a></p>
    </div>
  </div>
`;

const generateRejectionEmailHTML = (userName, reason) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
      <h1>Application Update</h1>
    </div>
    <div style="padding: 30px; background: white;">
      <h2>Hello ${userName},</h2>
      <p>Your merchant application requires additional information.</p>
      ${reason ? `<div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p><strong>Admin Note:</strong> ${reason}</p>
      </div>` : ''}
      <p>Please review your application and make the necessary updates.</p>
      <p><a href="${process.env.APP_URL}/merchant/login" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Update Application</a></p>
    </div>
  </div>
`;

// Generic email sending function (backward compatibility)
export async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Mepro" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      text: text,
      html: html || text,
    });

    console.log("✅ Email sent: %s", info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      info
    };
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
}