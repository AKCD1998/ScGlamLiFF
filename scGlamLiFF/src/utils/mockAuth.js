export const getMockUserId = () => {
  if (typeof window === "undefined") {
    return "U_TEST_001";
  }

  const stored = window.localStorage.getItem("mock_user_id");
  return stored && stored.trim() ? stored : "U_TEST_001";
};

export const storeMockUserIdFromQuery = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get("mock_user_id");

  if (queryValue && queryValue.trim()) {
    window.localStorage.setItem("mock_user_id", queryValue);
    return queryValue;
  }

  return null;
};
