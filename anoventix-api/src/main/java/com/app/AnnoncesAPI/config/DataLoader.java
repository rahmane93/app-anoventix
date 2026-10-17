package com.app.AnnoncesAPI.config;

import com.app.AnnoncesAPI.entities.Role;
import com.app.AnnoncesAPI.entities.User;
import com.app.AnnoncesAPI.enums.StatutUtilisateur;
import com.app.AnnoncesAPI.enums.TypeRole;
import com.app.AnnoncesAPI.repositories.RoleRepository;
import com.app.AnnoncesAPI.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;


@Configuration
public class DataLoader {

    private static final Logger logger = LoggerFactory.getLogger(DataLoader.class);

    @Value("${admin.email:}")
    private String adminEmail;

    @Value("${admin.password:}")
    private String adminPassword;

    @Bean
    CommandLineRunner initDatabase(RoleRepository roleRepository,
                                   UserRepository userRepository,
                                   PasswordEncoder passwordEncoder) {
        return args -> {
            // Initialisation des rôles
            logger.info("Vérification des rôles en base de données...");
            for (TypeRole typeRole : TypeRole.values()) {
                if (roleRepository.findByName(typeRole).isEmpty()) {
                    Role role = new Role();
                    role.setName(typeRole);
                    roleRepository.save(role);
                    logger.info("✓ Rôle {} créé", typeRole);
                }
            }
            logger.info("✅ Rôles vérifiés ({} rôles en base)", roleRepository.count());

            // Création du compte administrateur initial
            if (adminEmail.isBlank() || adminPassword.isBlank()) {
                logger.info("ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD non définis, aucun admin créé.");
                return;
            }

            if (userRepository.existsByRoleName(TypeRole.ADMINISTRATEUR)) {
                logger.info("ℹ️  Un administrateur existe déjà, création ignorée.");
                return;
            }

            Role adminRole = roleRepository.findByName(TypeRole.ADMINISTRATEUR)
                    .orElseThrow(() -> new IllegalStateException("Rôle ADMINISTRATEUR introuvable"));

            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setStatut(StatutUtilisateur.ACTIF);
            admin.setMustChangePassword(false);
            admin.setRole(adminRole);

            userRepository.save(admin);
            logger.info("✅ Compte administrateur créé : {}", adminEmail);
        };
    }
}
