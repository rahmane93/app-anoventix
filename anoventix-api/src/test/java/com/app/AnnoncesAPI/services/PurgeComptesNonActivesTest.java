package com.app.AnnoncesAPI.services;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;

/** Comptes jamais activés : relance à J+5, suppression à J+7 (DEC-06). */
@SpringBootTest
class PurgeComptesNonActivesTest {

    private static final List<String> TABLES = List.of("refresh_token", "verification_connexion", "code_secours",
            "email_sortant", "audit_event", "message", "conversation", "signalements", "avertissements",
            "historique_annonce", "medias", "account_favoris", "bien_immo", "annonce", "licence");

    @Autowired private PurgeComptesNonActivesService purge;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    @AfterEach
    void vider() {
        for (String table : TABLES) {
            jdbc.execute("DELETE FROM " + table);
        }
        userRepository.findAll().forEach(u -> { u.setEntreprise(null); u.setParentUser(null); userRepository.save(u); });
        jdbc.execute("DELETE FROM entreprises");
        userRepository.deleteAll();
    }

    @Test
    void uneRelanceEstEnvoyeeAJ5Puis_LeCompteDisparaitAJ7() {
        User j4 = nonActive("j4@example.com", 4);
        User j5 = nonActive("j5@example.com", 5);
        User j6 = nonActive("j6@example.com", 6);
        User j8 = nonActive("j8@example.com", 8);

        int relances = purge.relancer(LocalDateTime.now());

        // J+5 et J+6 sont relancés ; J+4 est trop tôt ; J+8 va être supprimé, inutile de le relancer.
        assertThat(relances).isEqualTo(2);
        assertThat(relance(j4)).isFalse();
        assertThat(relance(j5)).isTrue();
        assertThat(relance(j6)).isTrue();
        assertThat(relance(j8)).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM email_sortant WHERE destinataire = ?", Integer.class,
                "j5@example.com")).isEqualTo(1);
        String corps = jdbc.queryForObject("SELECT corps_html FROM email_sortant WHERE destinataire = ?",
                String.class, "j5@example.com");
        assertThat(corps).contains("/activate?token=").contains("supprim");

        // Une seule relance par compte, même si la tâche repasse.
        assertThat(purge.relancer(LocalDateTime.now())).isZero();
    }

    @Test
    void lesComptesNonActivesDepuis7JoursSontSupprimesEtLEmailRedevientLibre() {
        nonActive("vieux@example.com", 8);
        nonActive("recent@example.com", 6);
        User active = nonActive("actif@example.com", 30);
        jdbc.update("UPDATE account SET statut = 'ACTIF' WHERE id = ?", active.getId());

        int supprimes = purge.supprimer(LocalDateTime.now());

        assertThat(supprimes).isEqualTo(1);
        assertThat(userRepository.findByEmail("vieux@example.com")).isEmpty();
        assertThat(userRepository.findByEmail("recent@example.com")).isPresent();
        assertThat(userRepository.findByEmail("actif@example.com")).isPresent();
        nonActive("vieux@example.com", 0);
    }

    @Test
    void lesAgentsInvitesNeSontPasConcernes() {
        User pro = nonActive("pro@example.com", 0);
        jdbc.update("UPDATE account SET statut = 'ACTIF' WHERE id = ?", pro.getId());
        User agent = nonActive("agent@example.com", 10);
        jdbc.update("UPDATE account SET parent_user_id = ? WHERE id = ?", pro.getId(), agent.getId());

        assertThat(purge.relancer(LocalDateTime.now())).isZero();
        assertThat(purge.supprimer(LocalDateTime.now())).isZero();
        assertThat(userRepository.findByEmail("agent@example.com")).isPresent();
    }

    private boolean relance(User user) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT relance_activation_envoyee FROM account WHERE id = ?", Boolean.class, user.getId()));
    }

    /** Compte inscrit il y a {@code jours} jours, jamais activé. */
    private User nonActive(String email, int jours) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("hash");
        user.setPrenom("Aminata");
        user.setNom("Diallo");
        user.setStatut(StatutUtilisateur.EN_ATTENTE_ACTIVATION);
        user.setRole(roleRepository.findByName(TypeRole.PARTICULIER).orElseThrow());
        user = userRepository.save(user);
        jdbc.update("UPDATE account SET created_at = ? WHERE id = ?",
                LocalDateTime.now().minusDays(jours).minusMinutes(1), user.getId());
        return user;
    }
}
