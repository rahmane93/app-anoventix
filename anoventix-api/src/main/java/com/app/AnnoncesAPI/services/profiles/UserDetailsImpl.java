package com.app.AnnoncesAPI.services.profiles;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.fasterxml.jackson.annotation.JsonIgnore;

public class UserDetailsImpl implements UserDetails {
    private static final long serialVersionUID = 1L;

    private UUID id;
    private String email;

    @JsonIgnore
    private String password;

    private StatutUtilisateur statut;
    private boolean mustChangePassword;

    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(UUID id, String email, String password,
                         StatutUtilisateur statut, boolean mustChangePassword,
                         Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.statut = statut;
        this.mustChangePassword = mustChangePassword;
        this.authorities = authorities;
    }

    /** Timestamp ms du dernier changement de mot de passe (null = jamais). */
    private Long passwordChangedAt;

    /** Agent dont l'entreprise est désactivée : sans accès tant qu'elle ne l'est pas à nouveau (DEC-12). */
    private boolean entrepriseDesactivee;

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public Long getPasswordChangedAt() {
        return passwordChangedAt;
    }

    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = user.getRole() == null
                ? List.of()
                : List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().getName().name()));

        UserDetailsImpl details = new UserDetailsImpl(
                user.getId(),
                user.getEmail(),
                user.getPassword(),
                user.getStatut(),
                Boolean.TRUE.equals(user.getMustChangePassword()),
                authorities);
        details.passwordChangedAt = user.getPasswordChangedAt();
        details.entrepriseDesactivee = estAgentDUneEntrepriseDesactivee(user);
        return details;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        // Compte actif, OU agent en attente de changement de mot de passe initial
        return !entrepriseDesactivee
                && (statut == StatutUtilisateur.ACTIF
                    || (statut == StatutUtilisateur.EN_ATTENTE_ACTIVATION && mustChangePassword));
    }

    /**
     * Le professionnel propriétaire garde l'accès quand son entreprise est désactivée (il consulte sa
     * situation et contacte le support) ; ses agents l'ont perdu (RG-01-42). Statut du compte inchangé.
     */
    public static boolean estAgentDUneEntrepriseDesactivee(User user) {
        com.app.AnnoncesAPI.entities.Entreprise entreprise = user.getEntreprise();
        if (entreprise == null || !Boolean.FALSE.equals(entreprise.getActive())) {
            return false;
        }
        User proprietaire = entreprise.getAnnonceurProfessionnel();
        return proprietaire == null || !proprietaire.getId().equals(user.getId());
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(id, user.id);
    }
}