package com.app.AnnoncesAPI.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntrepriseProfilDTO {
    private EntreprisePubliqueDTO entreprise;
    private java.util.List<AnnonceDTO> annonces;
    private int currentPage;
    private long totalItems;
    private int totalPages;

    public static EntrepriseProfilDTO of(EntrepriseDTO entreprise, Page<AnnonceDTO> page) {
        return new EntrepriseProfilDTO(
                EntreprisePubliqueDTO.de(entreprise),
                page.getContent(),
                page.getNumber(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
