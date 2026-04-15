# 🛡️ Auth Service - Gold Standard Roadmap

> Service d'authentification gRPC hautement sécurisé, conforme RGPD et prêt pour la production.

## 🟢 Phase 1 : Consolidation du Cœur (Priorité Immédiate)

*L'objectif est de rendre le flux actuel incassable avant d'ajouter des features.*

- [x] **Register/Login** : Validation domaine, Argon2, Persistance.
- [x] **Logout** : Blacklist Redis fonctionnelle avec Middleware (Layer/Interceptor).
- [ ] **Refresh Token Rotation** :
  - [ ] Implémenter le `reuse detection` (si un vieux refresh token est utilisé, on invalide toute la famille de sessions).
  - [ ] Endpoint `rpc RefreshToken`.
- [ ] **Account Lockout** : Bannir temporairement une IP/Email après 5 échecs (Protection Brute-force).

## 🟡 Phase 2 : Durcissement Sécuritaire (2FA / MFA)

*Indispensable pour un service "Gold Standard".*

- [ ] **TOTP Engine** : Intégration d'une lib pour générer des secrets et valider des codes (ex: `totp-rs`).
- [ ] **Flow d'activation** :
  - [ ] `rpc Enable2FA` : Génère le secret + URL `otpauth://` pour QR Code.
  - [ ] `rpc Verify2FA` : Valide le premier code pour confirmer l'activation en DB.
- [ ] **MFA Login Flow** :
  - [ ] Modifier `Login` pour renvoyer un statut `MFA_REQUIRED` au lieu du JWT final.
  - [ ] `rpc LoginMFA` : Finalise la connexion avec le code TOTP.
- [ ] **Backup Codes** : Génération de 10 codes de secours à usage unique (hashés en DB).

## 🔵 Phase 3 : Gestion de Compte & RGPD (Conformité)

*Donner le contrôle à l'utilisateur sur ses données.*

- [ ] **Profil Utilisateur** :
  - [ ] `rpc GetAccount` : Retourne les infos `Me` (via Claims du Middleware).
  - [ ] `rpc UpdateProfile` : Changement email/username (avec validation).
- [ ] **RGPD - Droit à l'oubli** :
  - [ ] `rpc DeleteAccount` : Suppression physique ou anonymisation irréversible.
- [ ] **RGPD - Portabilité** :
  - [ ] `rpc ExportData` : Génération d'un JSON contenant l'intégralité des données stockées.
- [ ] **Audit Logs** :
  - [ ] Table `security_logs` : Tracer IP, User-Agent et type d'action (Login, 2FA Change, Password Reset).

## 🟣 Phase 4 : Identité Étendue (OAuth2 & Social)

*Transformer le service en Identity Provider.*

- [ ] **Social Auth** : Stratégies GitHub et Google.
- [ ] **Account Linking** : Permettre de lier un compte existant à un compte social.
- [ ] **OpenID Connect (OIDC)** : Si d'autres services doivent déléguer l'auth à ce service.

## ⚪ Phase 5 : Observabilité & Ops

- [ ] **Health Checks** : Implémenter le protocole standard gRPC Health.
- [ ] **Structured Logging** : `tracing` avec propagation de contextes.
- [ ] **Metrics** : Export Prometheus des succès/échecs d'auth et temps de réponse.
- [ ] **Rate Limiting** : Limiter les appels par IP au niveau gRPC.
