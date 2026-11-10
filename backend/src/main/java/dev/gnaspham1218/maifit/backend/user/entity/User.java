package dev.gnaspham1218.maifit.backend.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "users") // "user" is a reserved word in Postgres
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // required by JPA, hidden from other code
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false, unique = true, length = 30)
    private String username;

    @Column(length = 100)
    private String passwordHash; // NULL for Google-only accounts

    @Column(nullable = false, length = 50)
    private String displayName;

    @Column(nullable = false)
    private boolean emailVerified;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    // Premium ends at this time; null = never bought. Only changed by UserRepository.extendPremium
    // (one atomic UPDATE), so two payments confirmed at the same moment both count.
    @Column(insertable = false, updatable = false)
    private Instant premiumUntil;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    public User(String email, String username, String passwordHash, String displayName) {
        this.email = email;
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.emailVerified = false;
        this.role = Role.USER;
        this.createdAt = Instant.now();
    }

    // Business methods: written by hand, no @Setter
    public void markEmailVerified() {
        this.emailVerified = true;
    }

    public void changePasswordHash(String newPasswordHash) {
        this.passwordHash = newPasswordHash;
    }
}
