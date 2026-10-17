package com.app.AnnoncesAPI;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.app.AnnoncesAPI.services.EmailService;

/**
 * Test minimal de chargement du contexte Spring.
 *
 * <p>Vérifie que toutes les beans (controllers, services, repositories, security)
 * peuvent être instanciées sans erreur de configuration. C'est le filet de sécurité
 * basique : si quelque chose dans la configuration Spring est cassé, ce test échoue
 * avant même que les autres tests ne tournent.
 *
 * <p>{@link EmailService} est mocké pour ne pas tenter une vraie connexion SMTP.
 */
@SpringBootTest
class AnnoncesApiApplicationTests {

    @MockitoBean
    private EmailService emailService;

    @Test
    void contextLoads() {
        // Le simple chargement du contexte est l'assertion : Spring lèvera
        // une BeanCreationException si la config est invalide.
    }
}
