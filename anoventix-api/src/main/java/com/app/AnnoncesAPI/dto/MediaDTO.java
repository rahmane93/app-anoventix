package com.app.AnnoncesAPI.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// Classe pour les médias associés
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaDTO {
    private Long id;
    private String url;
    private String typeMime; // IMAGE, VIDEO, etc.
    private int ordre;
    /** Les variantes existent (usage interne : l'API expose les URL ci-dessous). */
    @com.fasterxml.jackson.annotation.JsonIgnore
    private boolean variantes;
    /** Miniature d'environ 400 px, pour les listes, les cartes et la carte (null pour une photo ancienne). */
    private String urlMiniature;
    /** Version d'environ 1080 px, pour la fiche (null pour une photo ancienne). */
    private String urlMoyenne;
}
