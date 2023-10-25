document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const resultContainer = document.getElementById("search-results");

    searchButton.addEventListener("click", function () {
        const searchText = searchInput.value;
        performSearch(searchText);
    });

    function performSearch(query) {
        const content = document.body.innerText;

        if (content.includes(query)) {
            const highlightedContent = highlightText(content, query);
            resultContainer.innerHTML = highlightedContent;
        } else {
            resultContainer.innerHTML = "Text not found.";
        }
    }

    function highlightText(content, query) {
        return content.replace(
            new RegExp(query, "g"),
            `<span class="highlighted">${query}</span>`
        );
    }
});
