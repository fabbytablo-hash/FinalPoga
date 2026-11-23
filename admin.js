
"use strict";

// ==========================================
// POGA KSA ADMIN DASHBOARD
// SUPABASE CONFIGURATION
// ==========================================

const SUPABASE_URL = "https://rocvqcqgbdohfwfkhncy.supabase.co";

const SUPABASE_KEY = "sb_publishable_wStACVHPYgU82oxbsvAWTg_EdkHrQaF";

const PHOTO_BUCKET = "member-photos";

// ==========================================
// INITIALIZATION
// ==========================================

const $ = (id) => document.getElementById(id);

const loginSection = $("loginSection");
const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginButton = $("loginButton");
const loginError = $("loginError");

const dashboardSection = $("dashboardSection");
const adminEmail = $("adminEmail");
const logoutButton = $("logoutButton");

const memberForm = $("memberForm");
const formTitle = $("formTitle");

const memberId = $("memberId");
const fullName = $("fullName");
const passportNumber = $("passportNumber");
const birthday = $("birthday");
const country = $("country");
const address = $("address");
const contact = $("contact");
const emergencyContact = $("emergencyContact");
const emergencyNumber = $("emergencyNumber");
const status = $("status");

const photo = $("photo");
const photoPreview = $("photoPreview");

const saveButton = $("saveButton");
const cancelEditButton = $("cancelEditButton");

const searchInput = $("searchInput");
const membersTableBody = $("membersTableBody");
const printAllMembersButton = $("printAllMembersButton");

const memberDetailsModal = $("memberDetailsModal");
const closeDetailsButton = $("closeDetailsButton");
const detailsPhoto = $("detailsPhoto");

const detailsMemberId = $("detailsMemberId");
const detailsFullName = $("detailsFullName");
const detailsPassport = $("detailsPassport");
const detailsBirthday = $("detailsBirthday");
const detailsCountry = $("detailsCountry");
const detailsContact = $("detailsContact");
const detailsAddress = $("detailsAddress");
const detailsEmergencyPerson = $("detailsEmergencyPerson");
const detailsEmergencyNumber = $("detailsEmergencyNumber");
const detailsStatus = $("detailsStatus");

const detailsPrintButton = $("detailsPrintButton");
const detailsEditButton = $("detailsEditButton");
const detailsCloseButton = $("detailsCloseButton");

// ==========================================
// CHECK REQUIRED ELEMENTS
// ==========================================

if (!loginForm || !memberForm || !dashboardSection) {
  console.error("Admin HTML elements are missing.");
  throw new Error("Please check your admin.html file.");
}

if (!window.supabase) {
  loginError.textContent =
    "Unable to connect to Supabase. Please refresh the page and check your internet connection.";

  loginError.classList.remove("hidden");

  throw new Error("Supabase library failed to load.");
}

// ==========================================
// CREATE SUPABASE CLIENT
// ==========================================

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// ==========================================
// VARIABLES
// ==========================================

let editingId = null;
let currentPhotoUrl = null;
let selectedPhotoFile = null;
let currentDetailsMemberId = null;
let currentMembers = [];
let isLoadingMembers = false;

// ==========================================
// GENERAL HELPERS
// ==========================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(element, message) {
  if (!element) return;

  element.textContent = message;
  element.classList.remove("hidden");
}

function hideMessage(element) {
  if (!element) return;

  element.textContent = "";
  element.classList.add("hidden");
}

function formatDate(dateString) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function sortMembers(data) {
  return data.sort((a, b) => {
    const numberA = parseInt(a.member_id, 10);
    const numberB = parseInt(b.member_id, 10);

    if (!Number.isNaN(numberA) && !Number.isNaN(numberB)) {
      return numberA - numberB;
    }

    return String(a.member_id || "").localeCompare(
      String(b.member_id || ""),
      undefined,
      {
        numeric: true,
        sensitivity: "base"
      }
    );
  });
}

function escapeSearchValue(value) {
  return String(value ?? "")
    .replace(/[%_]/g, "\\$&")
    .replace(/,/g, "\\,")
    .replace(/\./g, "\\.");
}

// ==========================================
// AUTHENTICATION
// ==========================================

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");

  adminEmail.textContent = "";

  loginPassword.value = "";
}

async function showDashboard(user) {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");

  adminEmail.textContent = user.email || "";

  await loadMembers();
}

async function checkAuth() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session) {
      await showDashboard(data.session.user);
    } else {
      showLogin();
    }

  } catch (error) {
    console.error("Authentication error:", error);

    showLogin();

    showMessage(
      loginError,
      "Unable to check login session: " + error.message
    );
  }
}

// ==========================================
// ADMIN LOGIN
// ==========================================

loginForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  hideMessage(loginError);

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showMessage(loginError, "Please enter your email and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) throw error;

    if (!data.session) {
      throw new Error("Login session was not created.");
    }

    await showDashboard(data.user);

  } catch (error) {
    console.error("Login failed:", error);

    showMessage(
      loginError,
      error.message || "Login failed. Please try again."
    );

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
});

// ==========================================
// ADMIN LOGOUT
// ==========================================

logoutButton.addEventListener("click", async function() {
  logoutButton.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    showLogin();

  } catch (error) {
    alert("Logout failed: " + error.message);

  } finally {
    logoutButton.disabled = false;
  }
});

// ==========================================
// AUTH SESSION CHANGES
// ==========================================

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_OUT") {
    showLogin();
  }
});

// ==========================================
// PHOTO VALIDATION
// ==========================================

photo.addEventListener("change", function() {
  const file = photo.files[0];

  selectedPhotoFile = null;

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select a valid image.");

    photo.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Photo must be 5MB or smaller.");

    photo.value = "";
    return;
  }

  selectedPhotoFile = file;

  showPhotoPreview(file);
});

// ==========================================
// PHOTO PREVIEW
// ==========================================

function showPhotoPreview(file) {
  const reader = new FileReader();

  reader.onload = function(event) {
    photoPreview.innerHTML = `
      <img
        src="${event.target.result}"
        class="member-photo"
        alt="Member Photo"
      >
    `;
  };

  reader.readAsDataURL(file);
}

// ==========================================
// PHOTO STORAGE PATH
// ==========================================

function getPhotoStoragePath(value) {
  if (!value) return null;

  let photoValue = String(value).trim();

  if (!photoValue) return null;

  if (!/^https?:\/\//i.test(photoValue)) {
    photoValue = photoValue.replace(/^\/+/, "");

    if (photoValue.startsWith(PHOTO_BUCKET + "/")) {
      photoValue = photoValue.slice(PHOTO_BUCKET.length + 1);
    }

    return photoValue || null;
  }

  try {
    const url = new URL(photoValue);

    const markers = [
      `/storage/v1/object/public/${PHOTO_BUCKET}/`,
      `/storage/v1/object/sign/${PHOTO_BUCKET}/`,
      `/storage/v1/object/download/${PHOTO_BUCKET}/`
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);

      if (index !== -1) {
        return decodeURIComponent(
          url.pathname.slice(index + marker.length)
        ).replace(/^\/+/, "");
      }
    }

  } catch (error) {
    console.error(error);
  }

  return null;
}

// ==========================================
// GET PHOTO URL
// ==========================================

async function resolveMemberPhoto(value) {
  if (!value) return null;

  const path = getPhotoStoragePath(value);

  if (!path) {
    return /^https?:\/\//i.test(String(value))
      ? String(value)
      : null;
  }

  const { data: signedData, error: signedError } =
    await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(path, 3600);

  if (signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  if (signedError) {
    console.warn(signedError.message);
  }

  const { data: publicData } =
    supabaseClient.storage
      .from(PHOTO_BUCKET)
      .getPublicUrl(path);

  return publicData?.publicUrl || null;
}

// ==========================================
// UPLOAD MEMBER PHOTO
// ==========================================

async function uploadPhoto(file) {
  if (!file) return null;

  const extension = file.name.split(".").pop().toLowerCase();

  const safeExtension =
    extension === "jpeg" ? "jpg" : extension;

  const fileName =
    "member_" +
    Date.now() +
    "_" +
    Math.random().toString(36).substring(2, 10) +
    "." +
    safeExtension;

  const { error } = await supabaseClient.storage
    .from(PHOTO_BUCKET)
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (error) throw error;

  return fileName;
}

// ==========================================
// GET MEMBER FORM DATA
// ==========================================

function getFormData(photoUrl) {
  return {
    member_id: memberId.value.trim(),
    full_name: fullName.value.trim(),
    passport_number: passportNumber.value.trim(),
    birthday: birthday.value,
    country_of_work: country.value || null,
    address: address.value.trim(),
    contact_number: contact.value.trim(),
    emergency_contact_person: emergencyContact.value.trim(),
    emergency_contact_number: emergencyNumber.value.trim(),
    membership_status: status.value,
    photo_url: photoUrl
  };
}

// ==========================================
// ADD / UPDATE MEMBER
// ==========================================

memberForm.addEventListener("submit", async function(event) {
  event.preventDefault();

  saveButton.disabled = true;

  saveButton.textContent = editingId
    ? "Updating..."
    : "Saving...";

  try {
    let photoUrl = currentPhotoUrl;

    if (selectedPhotoFile) {
      photoUrl = await uploadPhoto(selectedPhotoFile);
    }

    if (!editingId && !photoUrl) {
      throw new Error("Please select a member photo.");
    }

    const memberData = getFormData(photoUrl);

    if (editingId) {
      const { error } = await supabaseClient
        .from("members")
        .update(memberData)
        .eq("id", editingId);

      if (error) throw error;

      alert("Member updated successfully.");

    } else {
      const { error } = await supabaseClient
        .from("members")
        .insert([memberData]);

      if (error) throw error;

      alert("Member added successfully.");
    }

    resetForm();

    await loadMembers();

  } catch (error) {
    console.error("Member save error:", error);

    alert("Unable to save member: " + error.message);

  } finally {
    saveButton.disabled = false;

    saveButton.textContent = editingId
      ? "Update Member"
      : "Save Member";
  }
});

// ==========================================
// LOAD MEMBERS
// ==========================================

async function loadMembers() {
  if (isLoadingMembers) return;

  isLoadingMembers = true;

  try {
    const { data, error } = await supabaseClient
      .from("members")
      .select("*");

    if (error) throw error;

    currentMembers = sortMembers(data || []);

    await displayMembers(currentMembers);

  } catch (error) {
    console.error("Load members error:", error);

    alert("Unable to load members: " + error.message);

  } finally {
    isLoadingMembers = false;
  }
}

// ==========================================
// DISPLAY MEMBERS
// ==========================================

async function displayMembers(members) {
  membersTableBody.innerHTML = "";

  if (!members.length) {
    membersTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="empty">
          No members found.
        </td>
      </tr>
    `;

    return;
  }

  for (const member of members) {
    const row = document.createElement("tr");

    let photoHTML = `
      <div class="no-photo">No Photo</div>
    `;

    if (member.photo_url) {
      const url = await resolveMemberPhoto(member.photo_url);

      if (url) {
        photoHTML = `
          <img
            src="${escapeHTML(url)}"
            alt="Member Photo"
            class="member-photo"
          >
        `;
      }
    }

    row.innerHTML = `
      <td>${photoHTML}</td>

      <td>${escapeHTML(member.member_id)}</td>

      <td>${escapeHTML(member.full_name)}</td>

      <td>${escapeHTML(member.passport_number)}</td>

      <td>${escapeHTML(formatDate(member.birthday))}</td>

      <td>${escapeHTML(member.contact_number)}</td>

      <td>
        <span class="status">
          ${escapeHTML(member.membership_status)}
        </span>
      </td>

      <td>
        <div class="action-buttons">

          <button type="button"
            class="view-button"
            data-action="view"
            data-id="${escapeHTML(member.id)}">
            View Details
          </button>

          <button type="button"
            class="edit-button"
            data-action="edit"
            data-id="${escapeHTML(member.id)}">
            Edit
          </button>

          <button type="button"
            class="delete-button"
            data-action="delete"
            data-id="${escapeHTML(member.id)}">
            Delete
          </button>

        </div>
      </td>
    `;

    membersTableBody.appendChild(row);
  }
}

// ==========================================
// MEMBER RECORD ACTIONS
// ==========================================

membersTableBody.addEventListener("click", async function(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "view") {
    await viewMemberDetails(id);
  }

  if (action === "edit") {
    await editMember(id);
  }

  if (action === "delete") {
    await deleteMember(id);
  }
});

// ==========================================
// VIEW MEMBER DETAILS
// ==========================================

async function viewMemberDetails(id) {
  try {
    const { data: member, error } = await supabaseClient
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    currentDetailsMemberId = member.id;

    detailsPhoto.innerHTML = `
      <div class="no-photo">Loading Photo...</div>
    `;

    if (member.photo_url) {
      const url = await resolveMemberPhoto(member.photo_url);

      if (url) {
        const img = document.createElement("img");

        img.className = "member-details-photo-image";
        img.alt = "Member Photo";
        img.src = url;

        detailsPhoto.innerHTML = "";
        detailsPhoto.appendChild(img);

      } else {
        detailsPhoto.innerHTML =
          `<div class="no-photo">Photo unavailable</div>`;
      }

    } else {
      detailsPhoto.innerHTML =
        `<div class="no-photo">No Photo</div>`;
    }

    detailsMemberId.textContent = member.member_id || "-";
    detailsFullName.textContent = member.full_name || "-";
    detailsPassport.textContent = member.passport_number || "-";
    detailsBirthday.textContent = formatDate(member.birthday);
    detailsCountry.textContent = member.country_of_work || "-";
    detailsContact.textContent = member.contact_number || "-";
    detailsAddress.textContent = member.address || "-";

    detailsEmergencyPerson.textContent =
      member.emergency_contact_person || "-";

    detailsEmergencyNumber.textContent =
      member.emergency_contact_number || "-";

    detailsStatus.textContent =
      member.membership_status || "-";

    memberDetailsModal.classList.remove("hidden");

  } catch (error) {
    alert("Unable to load member details: " + error.message);
  }
}

// ==========================================
// CLOSE MEMBER DETAILS
// ==========================================

function closeMemberDetails() {
  memberDetailsModal.classList.add("hidden");
  currentDetailsMemberId = null;
}

closeDetailsButton.addEventListener("click", closeMemberDetails);

detailsCloseButton.addEventListener("click", closeMemberDetails);

memberDetailsModal.addEventListener("click", function(event) {
  if (event.target === memberDetailsModal) {
    closeMemberDetails();
  }
});

document.addEventListener("keydown", function(event) {
  if (event.key === "Escape") {
    closeMemberDetails();
  }
});

// ==========================================
// EDIT MEMBER
// ==========================================

async function editMember(id) {
  try {
    const { data: member, error } = await supabaseClient
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    editingId = member.id;

    formTitle.textContent = "Edit Member";

    memberId.value = member.member_id || "";
    fullName.value = member.full_name || "";
    passportNumber.value = member.passport_number || "";
    birthday.value = member.birthday || "";
    country.value = member.country_of_work || "";
    address.value = member.address || "";
    contact.value = member.contact_number || "";

    emergencyContact.value =
      member.emergency_contact_person || "";

    emergencyNumber.value =
      member.emergency_contact_number || "";

    status.value = member.membership_status || "Active";

    currentPhotoUrl = member.photo_url || null;
    selectedPhotoFile = null;

    photo.value = "";

    if (member.photo_url) {
      const url = await resolveMemberPhoto(member.photo_url);

      photoPreview.innerHTML = url
        ? `<img src="${escapeHTML(url)}" class="member-photo" alt="Current Photo">`
        : `<div class="no-photo">Photo unavailable</div>`;

    } else {
      photoPreview.innerHTML =
        `<div class="no-photo">No Photo</div>`;
    }

    saveButton.textContent = "Update Member";

    cancelEditButton.classList.remove("hidden");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {
    alert("Unable to print records: " + error.message);
  }
}

printAllMembersButton.addEventListener("click", printAllMembers);

// ==========================================
// INITIALIZE ADMIN DASHBOARD
// ==========================================

checkAuth();

console.log("POGA KSA Admin Dashboard initialized successfully.");
