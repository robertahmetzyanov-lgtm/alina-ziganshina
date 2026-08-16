const reviewsList = document.getElementById("reviews-list");
const reviewsPagination = document.getElementById("reviews-pagination");
const reviewForm = document.getElementById("review-form");
const reviewStatus = document.getElementById("review-status");
const reviewSetupNote = document.getElementById("review-setup-note");

const PAGE_SIZE = 3;
const LONG_TEXT_LIMIT = 120;
const REVIEW_MAX_LENGTH = 300;

const supabaseUrl = window.SUPABASE_URL?.trim();
const supabaseKey = window.SUPABASE_ANON_KEY?.trim();
const isConfigured = Boolean(supabaseUrl && supabaseKey && window.supabase);

let supabaseClient = null;
let allReviews = [];
let currentPage = 1;
let expandedReviewKey = null;

function getReviewKey(review) {
  return `${review.created_at}|${review.author_name}`;
}

if (isConfigured) {
  supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
  if (reviewSetupNote) {
    reviewSetupNote.hidden = true;
  }
} else if (reviewSetupNote) {
  reviewSetupNote.hidden = false;
}

function formatReviewDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setReviewStatus(message, type = "") {
  if (!reviewStatus) {
    return;
  }

  reviewStatus.textContent = message;
  reviewStatus.className = `review-form__status${type ? ` review-form__status--${type}` : ""}`;
}

function renderReviewCard(review) {
  const isLong = review.text.length > LONG_TEXT_LIMIT;
  const isExpanded = expandedReviewKey === getReviewKey(review);
  const textClass = isLong && !isExpanded ? "review__text is-clamped" : "review__text";
  const reviewKey = escapeHtml(getReviewKey(review));

  return `
    <article class="review">
      <p class="${textClass}">${escapeHtml(review.text)}</p>
      ${
        isLong && !isExpanded
          ? `<button class="review__more" type="button" data-review-key="${reviewKey}">Читать полностью</button>`
          : ""
      }
      <footer class="review__meta">
        <strong>${escapeHtml(review.author_name)}</strong>
        <time datetime="${review.created_at}">${formatReviewDate(review.created_at)}</time>
      </footer>
    </article>
  `;
}

function renderPagination() {
  if (!reviewsPagination) {
    return;
  }

  const totalPages = Math.ceil(allReviews.length / PAGE_SIZE);

  if (totalPages <= 1) {
    reviewsPagination.hidden = true;
    reviewsPagination.innerHTML = "";
    return;
  }

  reviewsPagination.hidden = false;
  reviewsPagination.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    const isActive = page === currentPage;
    return `
      <button
        class="reviews__page${isActive ? " is-active" : ""}"
        type="button"
        data-page="${page}"
        ${isActive ? 'aria-current="page"' : ""}
      >
        ${page}
      </button>
    `;
  }).join("");
}

function renderReviewsPage() {
  if (!reviewsList) {
    return;
  }

  if (!allReviews.length) {
    reviewsList.innerHTML = '<p class="reviews__empty">Пока нет отзывов — можете оставить первый.</p>';
    renderPagination();
    return;
  }

  const totalPages = Math.max(1, Math.ceil(allReviews.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageReviews = allReviews.slice(start, start + PAGE_SIZE);

  reviewsList.innerHTML = pageReviews.map(renderReviewCard).join("");
  renderPagination();
}

async function loadReviews({ resetPage = false } = {}) {
  if (!reviewsList) {
    return;
  }

  if (!supabaseClient) {
    reviewsList.innerHTML = '<p class="reviews__empty">Отзывы появятся после подключения базы данных.</p>';
    if (reviewsPagination) {
      reviewsPagination.hidden = true;
    }
    return;
  }

  const { data, error } = await supabaseClient
    .from("reviews")
    .select("author_name, text, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    reviewsList.innerHTML = '<p class="reviews__empty">Не удалось загрузить отзывы. Попробуйте обновить страницу.</p>';
    if (reviewsPagination) {
      reviewsPagination.hidden = true;
    }
    return;
  }

  allReviews = data ?? [];
  if (resetPage) {
    currentPage = 1;
    expandedReviewKey = null;
  }
  renderReviewsPage();
}

if (reviewsList) {
  reviewsList.addEventListener("click", (event) => {
    const expandButton = event.target.closest(".review__more");
    if (!expandButton) {
      return;
    }

    expandedReviewKey = expandButton.dataset.reviewKey ?? null;
    renderReviewsPage();
  });
}

if (reviewsPagination) {
  reviewsPagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) {
      return;
    }

    currentPage = Number(button.dataset.page);
    expandedReviewKey = null;
    renderReviewsPage();
    reviewsList?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

if (reviewForm) {
  reviewForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      setReviewStatus("Отзывы пока не подключены. Нужно настроить базу данных.", "error");
      return;
    }

    const formData = new FormData(reviewForm);
    const authorName = String(formData.get("author_name") ?? "").trim();
    const text = String(formData.get("text") ?? "").trim();
    const honeypot = String(formData.get("website") ?? "").trim();

    if (honeypot) {
      setReviewStatus("Спасибо!", "success");
      reviewForm.reset();
      return;
    }

    if (authorName.length < 2 || authorName.length > 50) {
      setReviewStatus("Укажите имя — от 2 до 50 символов.", "error");
      return;
    }

    if (text.length < 10 || text.length > REVIEW_MAX_LENGTH) {
      setReviewStatus(`Текст отзыва — от 10 до ${REVIEW_MAX_LENGTH} символов.`, "error");
      return;
    }

    const submitButton = reviewForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    setReviewStatus("Отправляем…");

    const { error } = await supabaseClient.from("reviews").insert({
      author_name: authorName,
      text,
    });

    submitButton.disabled = false;

    if (error) {
      setReviewStatus("Не удалось отправить отзыв. Попробуйте позже.", "error");
      return;
    }

    reviewForm.reset();
    setReviewStatus("Спасибо! Отзыв опубликован на сайте.", "success");
    await loadReviews({ resetPage: true });
  });
}

loadReviews();
