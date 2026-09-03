export const Route = createFileRoute("/_app/")({
    component: RouteComponent,
});

function RouteComponent() {
    const { isFetching, data: items } = useQuerySafe({
        queryKey: [selectedLibrary?.id, "items"],
        queryFn: () => window.chroma!.items.get({ libraryId: selectedLibrary!.id ?? "" }),
        enabled: !!selectedLibrary?.id,
        placeholderData: [],
    });
    const { selected, setSelected, handleSelect, handleRightClick, unselectAll } = useSelection({ items: filteredItems });
                    <ButtonGroup>
                        <Button variant="outline" size="icon" disabled={filteredItems.length === 0} onClick={() => updateSettings({ libraryExpanded: !settings.libraryExpanded })}>
                            <IconArrowAutofitHeight className="size-5" />
                        </Button>
                    </ButtonGroup>
}
