package com.app.AnnoncesAPI.payload.request;

import com.app.AnnoncesAPI.enums.MotifSignalementMessage;
import lombok.Data;

@Data
public class SignalerMessageRequest {

    /**
     * Obligatoire côté app. Toléré absent ici pour ne pas casser les versions
     * de l'app antérieures au motif (le signalement est alors enregistré sans motif).
     */
    private MotifSignalementMessage motif;
}
