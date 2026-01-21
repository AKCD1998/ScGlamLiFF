function LineProfileCard({ profile }) {
  return (
    <section className="my-treatment-card line-profile-card">
      <div className="line-profile-card__avatar">
        <div className="line-profile-card__avatar-inner" />
      </div>
      <div className="line-profile-card__info">
        <p>
          Line profile : <span>{profile.name}</span>
        </p>
        <p>
          UserId : <span>{profile.id}</span>
        </p>
        <p>
          เพศหญิง : <span>{profile.femaleCount}</span> คน
        </p>
      </div>
    </section>
  );
}

export default LineProfileCard;
