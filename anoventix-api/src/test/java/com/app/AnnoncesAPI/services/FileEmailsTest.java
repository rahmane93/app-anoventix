package com.app.AnnoncesAPI.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import com.app.AnnoncesAPI.entities.EmailSortant;
import com.app.AnnoncesAPI.entities.EmailSortant.Statut;
import com.app.AnnoncesAPI.repositories.EmailSortantRepository;

import jakarta.mail.MessagingException;

/** File d'envoi des emails : mise en file transactionnelle, envoi, nouvel essai, abandon. */
@SpringBootTest
class FileEmailsTest {

    @Autowired private NotificationService notificationService;
    @Autowired private EnvoiEmailsPlanifie envoi;
    @Autowired private EmailSortantRepository file;
    @Autowired private TransactionTemplate transaction;
    @MockitoBean private EmailService emailService;

    @BeforeEach
    void viderLaFile() {
        file.deleteAll();
    }

    @Test
    void unEmailMisEnFileEstEnvoyePuisSonSecretEfface() throws Exception {
        notificationService.envoyerActivation("a@test.com", "<a href='…?token=secret'>Activer</a>");

        assertThat(envoi.envoyerEnAttente()).isEqualTo(1);

        verify(emailService).sendEmail(eq("a@test.com"), eq("Activez votre compte AnoventiX"), any());
        EmailSortant email = file.findAll().getFirst();
        assertThat(email.getStatut()).isEqualTo(Statut.ENVOYE);
        assertThat(email.getCorpsHtml()).isNull();
        assertThat(email.getEnvoyeLe()).isNotNull();
    }

    @Test
    void unEmailNonSensibleGardeSonCorps() throws Exception {
        notificationService.envoyer("b@test.com", "Votre annonce", "<p>Bonjour</p>", false);

        envoi.envoyerEnAttente();

        assertThat(file.findAll().getFirst().getCorpsHtml()).isEqualTo("<p>Bonjour</p>");
    }

    @Test
    void rienNePartSiLaTransactionDeLAppelantEstAnnulee() throws Exception {
        transaction.executeWithoutResult(s -> {
            notificationService.envoyer("c@test.com", "Sujet", "<p>x</p>", false);
            s.setRollbackOnly();
        });

        assertThat(envoi.envoyerEnAttente()).isZero();
        verify(emailService, never()).sendEmail(any(), any(), any());
    }

    @Test
    void unEchecProgrammeUnNouvelEssaiSansBloquerLesAutres() throws Exception {
        doThrow(new MessagingException("SMTP indisponible"))
                .when(emailService).sendEmail(eq("ko@test.com"), any(), any());
        doNothing().when(emailService).sendEmail(eq("ok@test.com"), any(), any());
        notificationService.envoyer("ko@test.com", "Sujet", "<p>x</p>", false);
        notificationService.envoyer("ok@test.com", "Sujet", "<p>x</p>", false);

        assertThat(envoi.envoyerEnAttente()).isEqualTo(2);

        EmailSortant ko = file.findAll().stream()
                .filter(e -> e.getDestinataire().equals("ko@test.com")).findFirst().orElseThrow();
        assertThat(ko.getStatut()).isEqualTo(Statut.EN_ATTENTE);
        assertThat(ko.getTentatives()).isEqualTo(1);
        assertThat(ko.getDerniereErreur()).isEqualTo("SMTP indisponible");
        assertThat(ko.getProchainEssai()).isAfter(LocalDateTime.now());
        // Pas encore l'heure du nouvel essai : rien à envoyer.
        assertThat(envoi.envoyerEnAttente()).isZero();
    }

    @Test
    void unEmailEstAbandonneApresLeDernierEssai() {
        EmailSortant email = new EmailSortant("d@test.com", "Sujet", "<p>code 1234</p>", true);

        for (int essai = 1; essai <= EmailSortant.NOMBRE_NOUVEAUX_ESSAIS; essai++) {
            assertThat(email.marquerEchec("refus")).isFalse();
        }
        assertThat(email.marquerEchec("refus")).isTrue();

        assertThat(email.getStatut()).isEqualTo(Statut.ABANDONNE);
        assertThat(email.getCorpsHtml()).isNull();
    }
}
