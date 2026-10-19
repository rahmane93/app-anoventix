package com.app.AnnoncesAPI.services;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Envoi vers le service de notifications push d'Expo. Remplaçable dans les tests. */
@Component
public class ExpoPushClient {

    private static final Logger logger = LoggerFactory.getLogger(ExpoPushClient.class);

    private final RestClient client;
    private final boolean actif;

    public ExpoPushClient(@Value("${app.push.url:https://exp.host/--/api/v2/push/send}") String url,
                          @Value("${app.push.actif:true}") boolean actif) {
        SimpleClientHttpRequestFactory fabrique = new SimpleClientHttpRequestFactory();
        fabrique.setConnectTimeout(Duration.ofSeconds(5));
        fabrique.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder().baseUrl(url).requestFactory(fabrique).build();
        this.actif = actif;
    }

    /**
     * Envoie les messages ; retourne les jetons que le service déclare invalides (appareil désinstallé),
     * à supprimer. Toute erreur est journalisée : une notification perdue ne doit jamais casser une action.
     */
    @SuppressWarnings("unchecked")
    public List<String> envoyer(List<Map<String, Object>> messages) {
        List<String> invalides = new ArrayList<>();
        if (!actif || messages.isEmpty()) {
            return invalides;
        }
        try {
            Map<String, Object> reponse = client.post()
                    .header("Accept", "application/json")
                    .body(messages)
                    .retrieve()
                    .body(Map.class);
            List<Map<String, Object>> tickets = reponse == null ? List.of() : (List<Map<String, Object>>) reponse.get("data");
            for (int i = 0; tickets != null && i < tickets.size() && i < messages.size(); i++) {
                Map<String, Object> ticket = tickets.get(i);
                Map<String, Object> details = (Map<String, Object>) ticket.get("details");
                if ("error".equals(ticket.get("status")) && details != null
                        && "DeviceNotRegistered".equals(details.get("error"))) {
                    invalides.add(String.valueOf(messages.get(i).get("to")));
                }
            }
        } catch (RuntimeException e) {
            logger.warn("Envoi de notifications push impossible : {}", e.getMessage());
        }
        return invalides;
    }
}
