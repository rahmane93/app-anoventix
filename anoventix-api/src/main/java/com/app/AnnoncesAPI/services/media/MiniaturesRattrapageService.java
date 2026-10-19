package com.app.AnnoncesAPI.services.media;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.app.AnnoncesAPI.entities.Media;
import com.app.AnnoncesAPI.repositories.MediaRepository;

/**
 * Rattrapage des miniatures (ECART-55) : les photos enregistrées avant leur introduction n'ont que le fichier
 * d'origine. Chaque heure, un lot est décliné en miniature et en version moyenne ; une photo dont le fichier est
 * introuvable est ignorée et ne bloque pas les suivantes.
 */
@Service
public class MiniaturesRattrapageService {

    private static final Logger logger = LoggerFactory.getLogger(MiniaturesRattrapageService.class);
    static final int LOT = 100;

    private final MediaRepository medias;
    private final TransactionTemplate transaction;
    private final Path racine;
    /** Dernier identifiant traité : un fichier manquant n'est pas retenté à chaque passage. */
    private final AtomicLong curseur = new AtomicLong(0);

    public MiniaturesRattrapageService(MediaRepository medias, TransactionTemplate transaction,
                                       @Value("${upload.dir}") String uploadDir) {
        this.medias = medias;
        this.transaction = transaction;
        this.racine = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Scheduled(cron = "0 20 * * * *")
    public void rattraper() {
        try {
            int n = rattraperUnLot();
            if (n > 0) {
                logger.info("Miniatures : {} photo(s) rattrapée(s)", n);
            }
        } catch (RuntimeException e) {
            logger.error("Miniatures : échec du rattrapage", e);
        }
    }

    /** Traite un lot ; retourne le nombre de photos déclinées. Repart du début quand il n'y a plus rien après le curseur. */
    int rattraperUnLot() {
        List<Media> lot = medias.findSansVariantes(curseur.get(), PageRequest.of(0, LOT));
        if (lot.isEmpty()) {
            curseur.set(0);
            return 0;
        }
        int faites = 0;
        for (Media m : lot) {
            curseur.set(m.getId());
            Path fichier = racine.resolve(m.getUrl().substring("/uploads/".length())).normalize();
            if (!fichier.startsWith(racine) || !Files.isRegularFile(fichier) || !m.getUrl().endsWith(".jpg")) {
                continue;
            }
            try {
                VariantesPhoto.generer(fichier);
                transaction.executeWithoutResult(s -> {
                    m.setVariantes(true);
                    medias.save(m);
                });
                faites++;
            } catch (Exception e) {
                logger.warn("Miniatures : photo {} ignorée ({})", m.getId(), e.getMessage());
            }
        }
        return faites;
    }
}
