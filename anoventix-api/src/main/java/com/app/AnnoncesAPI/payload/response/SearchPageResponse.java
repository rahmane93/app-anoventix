package com.app.AnnoncesAPI.payload.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

@Getter
@AllArgsConstructor
public class SearchPageResponse<T> {
    private List<T> data;
    private int currentPage;
    private long totalItems;
    private int totalPages;
    private String query;

    public static <T> SearchPageResponse<T> of(Page<T> page, String query) {
        return new SearchPageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getTotalElements(),
                page.getTotalPages(),
                query);
    }
}
