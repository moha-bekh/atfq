use async_trait::async_trait;
use lettre::message::Mailbox;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::domain::error::DomainError;
use crate::domain::ports::email_service::EmailService;

pub struct SmtpEmailService {
    mailer: AsyncSmtpTransport<Tokio1Executor>,
    from: Mailbox,
}

impl SmtpEmailService {
    pub fn new(
        host: String,
        port: u16,
        username: Option<String>,
        password: Option<String>,
        from: String,
        use_tls: bool,
    ) -> Result<Self, DomainError> {
        let from = from
            .parse::<Mailbox>()
            .map_err(|error| DomainError::Internal(format!("Invalid SMTP_FROM: {error}")))?;
        let mut builder = if use_tls {
            AsyncSmtpTransport::<Tokio1Executor>::relay(&host)
                .map_err(|error| DomainError::Internal(format!("Invalid SMTP host: {error}")))?
                .port(port)
        } else {
            AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&host).port(port)
        };

        if let (Some(username), Some(password)) = (username, password) {
            if !username.is_empty() && !password.is_empty() {
                builder = builder.credentials(Credentials::new(username, password));
            }
        }

        let mailer = builder.build();

        Ok(Self { mailer, from })
    }
}

#[async_trait]
impl EmailService for SmtpEmailService {
    async fn send_password_reset(&self, to: &str, reset_url: &str) -> Result<(), DomainError> {
        let to = to.parse::<Mailbox>().map_err(|error| {
            DomainError::InvalidInput(format!("Invalid recipient email: {error}"))
        })?;

        let email = Message::builder()
            .from(self.from.clone())
            .to(to)
            .subject("Reset your ATFQ password")
            .body(format!(
                "A password reset was requested for your ATFQ account.\n\n\
                 Open this link to choose a new password:\n{reset_url}\n\n\
                 This link expires in 15 minutes. If you did not request this, you can ignore this email."
            ))
            .map_err(|error| DomainError::Internal(format!("Unable to build password reset email: {error}")))?;

        self.mailer.send(email).await.map_err(|error| {
            DomainError::Internal(format!("Unable to send password reset email: {error}"))
        })?;

        Ok(())
    }
}
