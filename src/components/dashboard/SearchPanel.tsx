type TaskList = {
  id: string;
  name: string;
};

type SearchPanelProps = {
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;

  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;

  filterListId: string;
  setFilterListId: React.Dispatch<React.SetStateAction<string>>;

  filterTag: string;
  setFilterTag: React.Dispatch<React.SetStateAction<string>>;

  filterStatus: string;
  setFilterStatus: React.Dispatch<React.SetStateAction<string>>;

  filterPriority: string;
  setFilterPriority: React.Dispatch<React.SetStateAction<string>>;

  filterImportant: string;
  setFilterImportant: React.Dispatch<React.SetStateAction<string>>;

  showArchived: boolean;
  setShowArchived: React.Dispatch<React.SetStateAction<boolean>>;

  lists: TaskList[];
  allTags: string[];
  visibleTasksCount: number;

  searchPanel: React.CSSProperties;
  searchPanelCollapsed: React.CSSProperties;
  searchToggleButton: React.CSSProperties;
  filterGroup: React.CSSProperties;
  filterLabel: React.CSSProperties;
  searchInput: React.CSSProperties;
  completedToggle: React.CSSProperties;
  resetFiltersButton: React.CSSProperties;
  searchStats: React.CSSProperties;
  metricCardSmall: React.CSSProperties;
  metricLabel: React.CSSProperties;
  metricValueSmall: React.CSSProperties;
};

export default function SearchPanel({
  isSearchOpen,
  setIsSearchOpen,
  searchTerm,
  setSearchTerm,
  filterListId,
  setFilterListId,
  filterTag,
  setFilterTag,
  filterStatus,
  setFilterStatus,
  filterPriority,
  setFilterPriority,
  filterImportant,
  setFilterImportant,
  showArchived,
  setShowArchived,
  lists,
  allTags,
  visibleTasksCount,
  searchPanel,
  searchPanelCollapsed,
  searchToggleButton,
  filterGroup,
  filterLabel,
  searchInput,
  completedToggle,
  resetFiltersButton,
  searchStats,
  metricCardSmall,
  metricLabel,
  metricValueSmall,
}: SearchPanelProps) {
  return (
    <aside style={isSearchOpen ? searchPanel : searchPanelCollapsed}>
      <button
        onClick={() => setIsSearchOpen((prev) => !prev)}
        style={searchToggleButton}
      >
        {isSearchOpen ? "Filtreleri Gizle" : "Ara"}
      </button>

      {isSearchOpen && (
        <>
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Arama ve Filtre</h2>

          <div style={filterGroup}>
            <label style={filterLabel}>Arama</label>
            <input
              type="text"
              placeholder="Kart, açıklama, etiket, link ara"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInput}
            />
          </div>

          <div style={filterGroup}>
            <label style={filterLabel}>Liste</label>
            <select
              value={filterListId}
              onChange={(e) => setFilterListId(e.target.value)}
              style={searchInput}
            >
              <option value="all">Tüm listeler</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          </div>

          <div style={filterGroup}>
            <label style={filterLabel}>Etiket</label>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              style={searchInput}
            >
              <option value="all">Tüm etiketler</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div style={filterGroup}>
            <label style={filterLabel}>Durum</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={searchInput}
            >
              <option value="all">Tümü</option>
              <option value="open">Açık</option>
              <option value="done">Tamamlanan</option>
            </select>
          </div>

          <div style={filterGroup}>
            <label style={filterLabel}>Öncelik</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={searchInput}
            >
              <option value="all">Tümü</option>
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>

          <div style={filterGroup}>
            <label style={filterLabel}>Önem</label>
            <select
              value={filterImportant}
              onChange={(e) => setFilterImportant(e.target.value)}
              style={searchInput}
            >
              <option value="all">Tümü</option>
              <option value="important">Yalnız önemli</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <div style={filterGroup}>
            <label style={filterLabel}>Arşiv</label>
            <label style={completedToggle}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              {showArchived ? "Arşivdekileri göster" : "Aktif kartları göster"}
            </label>
          </div>

          <button
            onClick={() => {
              setSearchTerm("");
              setFilterListId("all");
              setFilterTag("all");
              setFilterStatus("all");
              setFilterPriority("all");
              setFilterImportant("all");
              setShowArchived(false);
            }}
            style={resetFiltersButton}
          >
            Filtreleri Temizle
          </button>

          <div style={searchStats}>
            <div style={metricCardSmall}>
              <div style={metricLabel}>Görünen kart</div>
              <div style={metricValueSmall}>{visibleTasksCount}</div>
            </div>

            <div style={metricCardSmall}>
              <div style={metricLabel}>Toplam liste</div>
              <div style={metricValueSmall}>{lists.length}</div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}