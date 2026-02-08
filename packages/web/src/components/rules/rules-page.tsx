import { Container, Paper, Stack, Table, Text, Title } from "@mantine/core";

const RulesPage = () => {
  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            UNO CARD GAME - OFFICIAL RULES
          </Title>
          <Text size="sm" c="dimmed">
            Players: 2-10 | Age: 7+
          </Text>
        </div>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="xl">
            <section>
              <Title order={2} mb="md">
                Contents
              </Title>
              <Text>108 cards:</Text>
              <ul>
                <li>19 Blue cards (0-9) — 1 "0" and 2 each of "1-9"</li>
                <li>19 Green cards (0-9) — 1 "0" and 2 each of "1-9"</li>
                <li>19 Red cards (0-9) — 1 "0" and 2 each of "1-9"</li>
                <li>19 Yellow cards (0-9) — 1 "0" and 2 each of "1-9"</li>
                <li>8 Draw Two cards (2 each in blue, green, red, yellow)</li>
                <li>8 Reverse cards (2 each in blue, green, red, yellow)</li>
                <li>8 Skip cards (2 each in blue, green, red, yellow)</li>
                <li>4 Wild cards</li>
                <li>4 Wild Draw Four cards</li>
              </ul>
            </section>

            <section>
              <Title order={2} mb="md">
                Object of the Game
              </Title>
              <Text>
                Be the first player to get rid of all of your cards in each
                round and score points for the cards your opponents are left
                holding. Points in rounds accumulate and the first player to
                reach 500 points wins.
              </Text>
            </section>

            <section>
              <Title order={2} mb="md">
                Setup
              </Title>
              <ol>
                <li>
                  Each player draws a card; the player that draws the highest
                  number deals (count any card with a symbol as zero).
                </li>
                <li>The dealer shuffles and deals each player 7 cards.</li>
                <li>
                  Place the remainder of the deck facedown to form a DRAW pile.
                </li>
                <li>
                  The top card of the DRAW pile is turned over to begin a
                  DISCARD pile.
                </li>
              </ol>
              <Text size="sm" c="dimmed" mt="sm">
                <strong>NOTE:</strong> If any of the Action Cards (symbols) are
                turned over to start the DISCARD pile, see FUNCTIONS OF ACTION
                CARDS for special instructions.
              </Text>
            </section>

            <section>
              <Title order={2} mb="md">
                Let's Play
              </Title>
              <Text mb="md">
                The person to the left of the dealer starts play.
              </Text>
              <Text mb="md">
                On your turn, you must match a card from your hand to the card
                on the top of the DISCARD pile, either by{" "}
                <strong>number</strong>, <strong>color</strong>, or{" "}
                <strong>symbol</strong> (symbols represent Action Cards).
              </Text>
              <Text mb="md">
                <strong>EXAMPLE:</strong> If the card on the DISCARD pile is a
                red 7, the player must put down a red card OR any color 7.
                Alternatively, the player can put down a Wild card.
              </Text>

              <Title order={3} size="h4" mt="lg" mb="sm">
                Drawing Cards
              </Title>
              <Text mb="sm">
                If you don't have a card that matches the one on the DISCARD
                pile, you must take a card from the DRAW pile. If the card you
                picked up can be played, you are free to put it down in the same
                turn. Otherwise, play moves on to the next person in turn.
              </Text>
              <Text>
                You may also choose NOT to play a playable card from your hand.
                If so, you must draw a card from the DRAW pile. If playable,
                that card can be put down in the same turn, however you may not
                play any other card from your hand after the draw.
              </Text>
            </section>

            <section>
              <Title order={2} mb="md">
                Functions of Action Cards
              </Title>

              <Stack gap="lg">
                <div>
                  <Title order={3} size="h4" mb="xs">
                    Draw Two Card
                  </Title>
                  <Text>
                    When you play this card, the next player must draw 2 cards
                    and miss their turn. This card may only be played on a
                    matching color or on another Draw Two card. If turned up at
                    the beginning of play, the same rule applies.
                  </Text>
                </div>

                <div>
                  <Title order={3} size="h4" mb="xs">
                    Reverse Card
                  </Title>
                  <Text>
                    When you play this card, the direction of play reverses (if
                    play is currently to the left, then play changes to the
                    right, and vice versa). This card may only be played on a
                    matching color or on another Reverse card. If this card is
                    turned up at the beginning of play, the dealer goes first,
                    then play moves to the right instead of the left.
                  </Text>
                </div>

                <div>
                  <Title order={3} size="h4" mb="xs">
                    Skip Card
                  </Title>
                  <Text>
                    When you play this card, the next player is "skipped" (loses
                    their turn). This card may only be played on a matching
                    color or on another Skip card. If a Skip card is turned up
                    at the beginning of play, the player to the left of the
                    dealer is "skipped," hence the player to the left of that
                    player starts play.
                  </Text>
                </div>

                <div>
                  <Title order={3} size="h4" mb="xs">
                    Wild Card
                  </Title>
                  <Text>
                    When you play this card, you get to choose the color that
                    continues play (any color including the color in play before
                    the Wild card was laid down). You may play a Wild card on
                    your turn even if you have another playable card in your
                    hand. If a Wild card is turned up at the beginning of play,
                    the person to the left of the dealer chooses the color that
                    continues play.
                  </Text>
                </div>

                <div>
                  <Title order={3} size="h4" mb="xs">
                    Wild Draw Four Card
                  </Title>
                  <Text mb="sm">
                    When you play this card, you get to choose the color that
                    continues play PLUS the next player must draw 4 cards from
                    the DRAW pile and lose their turn.
                  </Text>
                  <Text mb="sm">
                    <strong>However, there is a hitch!</strong> You may only
                    play this card when you do NOT have another card in your
                    hand that matches the COLOR on the DISCARD pile (but it is
                    acceptable to play this card if you have matching number or
                    Action Cards). If turned up at the beginning of play, return
                    this card to the deck and pick another card.
                  </Text>
                  <Text size="sm" c="dimmed">
                    <strong>NOTE:</strong> If you suspect that a Wild Draw 4
                    card has been played on you illegally (i.e. the player has a
                    matching card), then you may challenge that player. The
                    challenged player must show you (the challenger) their hand.
                    If guilty, the challenged player must draw the 4 cards
                    instead of you. However, if the challenged player is
                    innocent, you must draw the 4 cards PLUS an additional 2
                    cards (6 total)!
                  </Text>
                </div>
              </Stack>
            </section>

            <section>
              <Title order={2} mb="md">
                Going Out
              </Title>
              <Text mb="md">
                When you play your next-to-last card, you must yell{" "}
                <strong>"UNO"</strong> (meaning "one") to indicate that you have
                only one card left. If you don't yell "UNO" and you are caught
                before the next player begins their turn, you must draw two
                cards.
              </Text>
              <Text mb="md">
                Once a player has no cards left, the round is over. Points are
                scored and play starts over again.
              </Text>
              <Text mb="md">
                If the last card played in a round is a Draw Two or Wild Draw
                Four card, the next player must draw the 2 or 4 cards
                respectively. These cards are counted when the points are
                totaled.
              </Text>
              <Text>
                If no player is out of cards by the time the DRAW pile is
                depleted, the DISCARD pile is reshuffled and play continues.
              </Text>
            </section>

            <section>
              <Title order={2} mb="md">
                Scoring
              </Title>
              <Text mb="md">
                The first player to get rid of their cards in a round receives
                points for all of the cards left in their opponents' hands as
                follows:
              </Text>

              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Card Type</Table.Th>
                    <Table.Th>Points</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>All number cards (0-9)</Table.Td>
                    <Table.Td>Face Value</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Draw Two</Table.Td>
                    <Table.Td>20 Points</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Reverse</Table.Td>
                    <Table.Td>20 Points</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Skip</Table.Td>
                    <Table.Td>20 Points</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Wild</Table.Td>
                    <Table.Td>50 Points</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Wild Draw Four</Table.Td>
                    <Table.Td>50 Points</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>

              <Text mt="md">
                Once the score for the round has been tallied, if no player has
                reached 500 points, reshuffle the cards and begin a new round.
              </Text>
            </section>

            <section>
              <Title order={2} mb="md">
                Winning the Game
              </Title>
              <Text mb="md">
                The <strong>WINNER</strong> is the first player to reach{" "}
                <strong>500 points</strong>.
              </Text>

              <Title order={3} size="h4" mb="xs">
                Alternative Scoring and Winning
              </Title>
              <Text>
                Another way to score points is to keep a running tally of the
                points each player is left with at the end of each round. When
                one player reaches 500 points, the player with the lowest points
                is the winner.
              </Text>
            </section>

            <section>
              <Title order={2} mb="md">
                HOUSE RULES
              </Title>
              <Text mb="lg">
                You may want to try some of the following "House" Rules when
                playing UNO card game.
              </Text>

              <Stack gap="lg">
                <div>
                  <Title order={3} size="h4" mb="xs">
                    Stacking
                  </Title>
                  <Text mb="sm">Same rules as UNO card game, except:</Text>
                  <ol>
                    <li>
                      When a player plays a Draw Two card, the next player may
                      play another Draw Two card, causing the next player to
                      draw 4 cards.
                    </li>
                    <li>
                      Same rule applies to Wild Draw Four cards: When a player
                      plays a Wild Draw Four card, the next player may play
                      another Wild Draw Four card, causing the next player to
                      draw 8 cards. The last player to play a consecutive Wild
                      Draw Four card calls the color to continue play.
                    </li>
                    <li>
                      Players can continue to play consecutive Draw Two or Wild
                      Draw Four cards, as long as they have them in their hands.
                    </li>
                    <li>
                      You can only play one Draw Two or Wild Draw Four during
                      your turn, even though you may have multiples of these
                      cards in your hand.
                    </li>
                  </ol>
                </div>

                <div>
                  <Title order={3} size="h4" mb="xs">
                    Draw to Match
                  </Title>
                  <Text>
                    Same rules as UNO card game, except: When you draw a card
                    from the DRAW pile (because you have no playable card), you
                    may continue drawing cards one at a time until you draw a
                    card that matches the card on top of the DISCARD pile by
                    number, color, or symbol. Once you draw a matching card, you
                    may play it immediately in the same turn.
                  </Text>
                </div>
              </Stack>

              <Text mt="lg" fs="italic" c="dimmed">
                For a truly twisted game, try combining multiple UNO CARD GAME
                HOUSE RULES. If the rules conflict, let YOUR HOUSE define the
                best way to play!
              </Text>
            </section>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default RulesPage;
