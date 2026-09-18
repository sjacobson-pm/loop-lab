/* v8 ignore start -- justification: this is a sample page and thus will not be tested */

import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';

import { fontAwesomeConfig } from 'configs/fontAwesomeConfig';
import { INPUT_GROUP_ADD_ON_TYPE } from 'features/ui/form-controls/input-group/add-ons/enums/inputGroupAddOnType';
import { useAuthenticatedUser } from 'hooks/useAuthenticatedUser';
import { usePageSetup } from 'pages/hooks/usePageSetup';

import { AuthInProgress } from 'features/auth/AuthInProgress';
import { MicrosoftAuthInProgress } from 'features/auth/microsoft/MicrosoftAuthInProgress';
import { ErrorAlert } from 'features/ui/alerts/ErrorAlert';
import { InfoAlert } from 'features/ui/alerts/InfoAlert';
import { LoadingAlert } from 'features/ui/alerts/LoadingAlert';
import { SuccessAlert } from 'features/ui/alerts/SuccessAlert';
import { CollapsibleFormSection } from 'features/ui/collapsible-form-section/CollapsibleFormSection';
import { DatePicker } from 'features/ui/form-controls/date-picker/DatePicker';
import { InputGroup } from 'features/ui/form-controls/input-group/InputGroup';
import { StaffAutocomplete } from 'features/ui/form-controls/staff-autocomplete/StaffAutocomplete';
import { ConfirmationModal } from 'features/ui/modals/ConfirmationModal';
import { PageOverlay } from 'features/ui/page-overlay/PageOverlay';
import { Pagination } from 'features/ui/pagination/Pagination';
import { ErrorMessageTableRow } from 'features/ui/tables/table-rows/ErrorMessageTableRow';
import { LoadingMessageTableRow } from 'features/ui/tables/table-rows/LoadingMessageTableRow';
import { TableRowOverlay } from 'features/ui/tables/table-rows/TableRowOverlay';

const SampleHome = () => {
  // **********************************************************************
  // * constants / component vars

  const PAGE_SUBTITLE = 'Welcome to the Sample Home Page';
  const SHOW_SIDE_BAR = true;

  const { currentUser, currentStaff } = useAuthenticatedUser();

  const { classicSolidIcons } = fontAwesomeConfig;

  const [pageOverlay, setPageOverlay] = useState({ isVisible: false, isTranslucent: false });
  const [confirmationModal, setConfirmationModal] = useState({ isOpen: false });

  const paginationItemCount = 500;
  const [paginationState, setPaginationState] = useState({ pageSize: 10, currentPage: 1 });

  const [supervisorStaffId, setSupervisorStaffId] = useState('');
  const [managerStaffId, setManagerStaffId] = useState(14936);

  const [showInputGroupIconClickMessage, setShowInputGroupIconClickMessage] = useState(false);
  const [showInputGroupButtonClickMessage, setShowInputGroupButtonClickMessage] = useState(false);

  const [dateValue, setDateValue] = useState(null);

  // **********************************************************************
  // * functions

  // **********************************************************************
  // * handlers

  const handlePaginationPageItemClick = (pageNumber) => {
    setPaginationState((prevState) => ({ ...prevState, currentPage: pageNumber }));
  };

  const handlePaginationPageSizeItemClick = (pageSize) => {
    setPaginationState((prevState) => ({ ...prevState, currentPage: 1, pageSize }));
  };

  const handleSupervisorChange = (e) => setSupervisorStaffId(e.valueTarget.value);
  const handleManagerChange = (e) => setManagerStaffId(e.valueTarget.value);

  const handleInputGroupSlidersClick = () => setShowInputGroupIconClickMessage(!showInputGroupIconClickMessage);
  const handleInputGroupButtonClick = () => setShowInputGroupButtonClickMessage(!showInputGroupButtonClickMessage);

  // **********************************************************************
  // * side effects

  usePageSetup({ subtitle: PAGE_SUBTITLE, showSideBar: SHOW_SIDE_BAR });

  // **********************************************************************
  // * render

  return (
    <div className="tw:container tw:mx-auto tw:my-4 tw:px-8">
      <h1>This is a sample home page</h1>
      <hr />

      {/* authenticated user/staff information */}
      <section className="tw:mb-8 tw:flex tw:flex-col tw:gap-8">
        <h2>Authenticated User Information</h2>

        {/* auth info */}
        <Card>
          <Card.Header>User Info (MSAL)</Card.Header>
          <Card.Body>
            <pre>{JSON.stringify(currentUser, null, 2)}</pre>
          </Card.Body>
        </Card>

        {/* staff info */}
        <Card>
          <Card.Header>Staff Info (CDS)</Card.Header>
          <Card.Body>
            {currentStaff.isLoading ? <p>Loading staff information...</p> : null}
            {currentStaff.isError ? <p>Error loading staff information: {currentStaff.error.message}</p> : null}
            {currentStaff.isSuccess ? <pre>{JSON.stringify(currentStaff.data, null, 2)}</pre> : null}
          </Card.Body>
        </Card>
      </section>

      {/* custom components */}
      <section className="tw:mb-8 tw:flex tw:flex-col tw:gap-8">
        <h2>Sample Custom Components</h2>

        {/* auth */}
        <Card>
          <Card.Header>Authentication</Card.Header>
          <Card.Body className="tw:flex tw:flex-col tw:gap-4">
            <h3>
              <code>&lt;AuthInProgress /&gt;</code>
            </h3>
            <AuthInProgress authTypeName="My Auth Provider" authTypeIcon={classicSolidIcons.faGear} />

            <h3>
              <code>&lt;MicrosoftAuthInProgress /&gt;</code>
            </h3>
            <MicrosoftAuthInProgress />
          </Card.Body>
        </Card>

        {/* alerts */}
        <Card>
          <Card.Header>Alerts</Card.Header>
          <Card.Body>
            <h3>
              <code>&lt;LoadingAlert /&gt;</code>
            </h3>
            <LoadingAlert displayText="Something is loading..." />

            <h3>
              <code>&lt;InfoAlert /&gt;</code>
            </h3>
            <InfoAlert displayText="Some informational message!" />

            <h3>
              <code>&lt;SuccessAlert /&gt;</code>
            </h3>
            <SuccessAlert displayText="Some success message!" />

            <h3>
              <code>&lt;ErrorAlert /&gt;</code>
            </h3>
            <ErrorAlert
              displayText="Something went wrong..."
              error={{ message: 'Some sample error message', traceId: '123456789-9876' }}
            />
          </Card.Body>
        </Card>

        {/* collapsible form section */}
        <Card>
          <Card.Header>Collapsible Form Section</Card.Header>
          <Card.Body>
            <CollapsibleFormSection id="sample-section" title="Sample Section 1">
              <div className="tw:p-2">
                <p>
                  Lorem ipsum, dolor sit amet consectetur adipisicing elit. Temporibus nihil, dolore obcaecati eveniet
                  cum alias sunt laboriosam dolorem error optio quidem praesentium, delectus aut quasi aspernatur
                  commodi, aliquam tempora! Architecto.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipisicing elit. Iste omnis dolor debitis odio vel quibusdam
                  odit voluptas error tempora magni sint velit atque ipsum unde minus nesciunt, suscipit soluta dolorem?
                </p>
              </div>
            </CollapsibleFormSection>

            <CollapsibleFormSection id="sample-section" title="Sample Section 2">
              <div className="tw:p-2">
                <form>
                  <div className="mb-3">
                    <label htmlFor="email-address-01" className="form-label">
                      Email address
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email-address-01"
                      aria-describedby="email-address-help"
                    />
                    <div id="email-address-help-01" className="form-text">
                      We&apos;ll never share your email with anyone else.
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="password-01" className="form-label">
                      Password
                    </label>
                    <input type="password" className="form-control" id="password-01" />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="state-01" className="form-label">
                      State
                    </label>
                    <select className="form-select" id="state-01">
                      <option value="">Select...</option>
                      <option value="CA">California</option>
                      <option value="NY">New York</option>
                      <option value="TX">Texas</option>
                    </select>
                  </div>
                  <div className="form-check mb-3">
                    <input type="checkbox" className="form-check-input" id="example-checkbox-01" />
                    <label className="form-check-label" htmlFor="example-checkbox-01">
                      Check me out
                    </label>
                  </div>
                  <div className="tw:flex tw:justify-end tw:gap-2">
                    <Button type="submit" variant="primary">
                      Submit
                    </Button>
                    <Button type="submit" variant="secondary">
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </CollapsibleFormSection>
          </Card.Body>
        </Card>

        {/* custom form controls */}
        <Card>
          <Card.Header>Custom Form Controls</Card.Header>
          <Card.Body>
            <div className="tw:mb-3">
              <h3>
                <code>&lt;AutoComplete /&gt;</code>
              </h3>

              <form>
                <div className="mb-3">
                  <label htmlFor="supervisor--autocomplete" className="form-label">
                    Staff Autocomplete #1
                  </label>
                  <StaffAutocomplete name="supervisor" value={supervisorStaffId} onChange={handleSupervisorChange} />
                </div>
                <div className="mb-3">
                  <label htmlFor="manager--autocomplete" className="form-label">
                    Staff Autocomplete #2
                  </label>
                  <StaffAutocomplete name="manager" value={managerStaffId} onChange={handleManagerChange} />
                  <div className="form-text">(pre-populated with a valid staff id)</div>
                </div>
              </form>
            </div>

            <div className="tw:mb-3">
              <h3>
                <code>&lt;InputGroup /&gt;</code>
              </h3>

              <div className="tw:flex tw:flex-col tw:gap-2">
                <InputGroup
                  prependAddOns={[{ addOnType: INPUT_GROUP_ADD_ON_TYPE.text, text: '$' }]}
                  appendAddOns={[{ addOnType: INPUT_GROUP_ADD_ON_TYPE.text, text: '.00' }]}>
                  <input type="text" className="form-control" placeholder="Type something..." />
                </InputGroup>
                <InputGroup
                  prependAddOns={[
                    {
                      addOnType: INPUT_GROUP_ADD_ON_TYPE.icon,
                      icon: classicSolidIcons.faSliders,
                      onClick: handleInputGroupSlidersClick,
                    },
                  ]}
                  appendAddOns={[
                    {
                      addOnType: INPUT_GROUP_ADD_ON_TYPE.icon,
                      icon: classicSolidIcons.faCircleInfo,
                      extendedContainerClass: 'text-info',
                      popover: {
                        title: 'Information',
                        content: 'This is some important information.',
                        placement: 'auto',
                      },
                    },
                  ]}>
                  <input type="text" className="form-control" placeholder="Type something..." />
                </InputGroup>
                {showInputGroupIconClickMessage ? (
                  <Form.Text muted>You clicked the sliders icon! Click it again to dismiss this message.</Form.Text>
                ) : null}

                <InputGroup
                  appendAddOns={[
                    {
                      addOnType: INPUT_GROUP_ADD_ON_TYPE.button,
                      text: 'Click Me',
                      variant: 'primary',
                      onClick: handleInputGroupButtonClick,
                    },
                  ]}>
                  <input type="text" className="form-control" placeholder="Type something..." />
                </InputGroup>
                {showInputGroupButtonClickMessage ? (
                  <Form.Text muted>You clicked the button! Click it again to dismiss this message.</Form.Text>
                ) : null}
              </div>
            </div>

            <div className="tw:mb-3">
              <h3>
                <code>&lt;DatePicker /&gt;</code>
              </h3>

              <form>
                <div className="mb-3 tw:w-lg">
                  <label htmlFor="some-date" className="form-label">
                    Some Date
                  </label>
                  <DatePicker
                    name="some-date"
                    placeholder="Select a date..."
                    minDate={new Date(2025, 0, 1)}
                    value={dateValue}
                    onChange={(e) => setDateValue(e.target.value)}
                  />
                </div>
              </form>
            </div>
          </Card.Body>
        </Card>

        {/* page overlay */}
        <Card>
          <Card.Header>Page Overlay</Card.Header>
          <Card.Body>
            <div className="tw:flex tw:gap-2">
              <Button onClick={() => setPageOverlay({ isVisible: true, isTranslucent: false })} variant="primary">
                Show Overlay
              </Button>
              <Button
                onClick={() => setPageOverlay({ isVisible: true, isTranslucent: true })}
                variant="secondary"
                className="tw:ml-2">
                Show Translucent Overlay
              </Button>
            </div>
            {pageOverlay.isVisible ? (
              <PageOverlay isTranslucent={pageOverlay.isTranslucent}>
                <div className="tw:flex tw:h-full tw:flex-col tw:items-center tw:justify-center tw:gap-4">
                  <Card border="danger">
                    <Card.Header>Overlay Content</Card.Header>
                    <Card.Body>
                      <Card.Title>Some random title</Card.Title>
                      <Card.Text>This is a card sitting on an overlay...</Card.Text>
                      <Card.Text>
                        <Button
                          onClick={() => setPageOverlay({ isVisible: false, isTranslucent: false })}
                          variant="secondary">
                          Close Overlay
                        </Button>
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </div>
              </PageOverlay>
            ) : null}
          </Card.Body>
        </Card>

        {/* modals */}
        <Card>
          <Card.Header>Modals</Card.Header>
          <Card.Body>
            <h3>
              <code>&lt;ConfirmationModal /&gt;</code>
            </h3>
            <div className="tw:flex tw:gap-2">
              <Button onClick={() => setConfirmationModal({ isOpen: true })} variant="primary">
                Show Confirmation Modal
              </Button>
            </div>
            <ConfirmationModal
              isOpen={confirmationModal.isOpen}
              title="Confirm Action"
              confirmationMessage="Are you sure you want to proceed?"
              confirmButtonText="Yes"
              cancelButtonText="No"
              onConfirm={() => setConfirmationModal({ isOpen: false })}
              onCancel={() => setConfirmationModal({ isOpen: false })}
            />
          </Card.Body>
        </Card>

        {/* tables */}
        <Card>
          <Card.Header>Table Components</Card.Header>
          <Card.Body>
            <h3>
              <code>&lt;LoadingMessageTableRow /&gt;</code>
            </h3>
            <Table responsive className="pm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>John</td>
                  <td>Doe</td>
                  <td>john.doe@example.com</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Jane</td>
                  <td>Smith</td>
                  <td>jane.smith@example.com</td>
                </tr>
                <LoadingMessageTableRow colSpan={4} loadingMessage="Loading row data..." />
                <tr>
                  <td>3</td>
                  <td>Emily</td>
                  <td>Johnson</td>
                  <td>emily.johnson@example.com</td>
                </tr>
              </tbody>
            </Table>

            <h3>
              <code>&lt;ErrorMessageTableRow /&gt;</code>
            </h3>
            <Table responsive className="pm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>John</td>
                  <td>Doe</td>
                  <td>john.doe@example.com</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Jane</td>
                  <td>Smith</td>
                  <td>jane.smith@example.com</td>
                </tr>
                <ErrorMessageTableRow colSpan={4} errorMessage="Failed to load row data." />
                <tr>
                  <td>3</td>
                  <td>Emily</td>
                  <td>Johnson</td>
                  <td>emily.johnson@example.com</td>
                </tr>
              </tbody>
            </Table>

            <h3>
              <code>&lt;TableRowOverlay overlayType=&quot;info&quot; /&gt;</code>
            </h3>
            <Table responsive className="pm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>John</td>
                  <td>Doe</td>
                  <td>john.doe@example.com</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Jane</td>
                  <td>Smith</td>
                  <td>jane.smith@example.com</td>
                </tr>
                <tr>
                  <td>
                    <TableRowOverlay overlayType="info" message="This row is currently being processed..." />3
                  </td>
                  <td>Emily</td>
                  <td>Johnson</td>
                  <td>emily.johnson@example.com</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>Michael</td>
                  <td>Williams</td>
                  <td>michael.williams@example.com</td>
                </tr>
              </tbody>
            </Table>

            <h3>
              <code>&lt;TableRowOverlay overlayType=&quot;error&quot; /&gt;</code>
            </h3>
            <Table responsive className="pm-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>John</td>
                  <td>Doe</td>
                  <td>john.doe@example.com</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>Jane</td>
                  <td>Smith</td>
                  <td>jane.smith@example.com</td>
                </tr>
                <tr>
                  <td>
                    <TableRowOverlay overlayType="error" message="This row encountered an error during processing." />3
                  </td>
                  <td>Emily</td>
                  <td>Johnson</td>
                  <td>emily.johnson@example.com</td>
                </tr>
                <tr>
                  <td>4</td>
                  <td>Michael</td>
                  <td>Williams</td>
                  <td>michael.williams@example.com</td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>

        {/* pagination */}
        <Card>
          <Card.Header>Pagination</Card.Header>
          <Card.Body>
            <Pagination
              pageSize={paginationState.pageSize}
              currentPage={paginationState.currentPage}
              totalPageCount={Math.ceil(paginationItemCount / paginationState.pageSize)}
              prePostItemCount={2}
              onPageItemClick={handlePaginationPageItemClick}
              onPageSizeItemClick={handlePaginationPageSizeItemClick}
            />
          </Card.Body>
        </Card>
      </section>

      {/* bootstrap controls */}
      <section className="tw:mb-8 tw:flex tw:flex-col tw:gap-8">
        <h2>Sample Bootstrap Controls</h2>

        {/* forms */}
        <Card>
          <Card.Header>Sample Form</Card.Header>
          <Card.Body>
            <form>
              <div className="mb-3">
                <label htmlFor="email-address" className="form-label">
                  Email address
                </label>
                <input type="email" className="form-control" id="email-address" aria-describedby="email-address-help" />
                <div id="email-address-help" className="form-text">
                  We&apos;ll never share your email with anyone else.
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input type="password" className="form-control" id="password" />
              </div>
              <div className="mb-3">
                <label htmlFor="state" className="form-label">
                  State
                </label>
                <select className="form-select" id="state">
                  <option value="">Select...</option>
                  <option value="CA">California</option>
                  <option value="NY">New York</option>
                  <option value="TX">Texas</option>
                </select>
              </div>
              <div className="form-check mb-3">
                <input type="checkbox" className="form-check-input" id="example-checkbox" />
                <label className="form-check-label" htmlFor="example-checkbox">
                  Check me out
                </label>
              </div>
              <div className="tw:flex tw:justify-end tw:gap-2">
                <Button type="submit" variant="primary">
                  Submit
                </Button>
                <Button type="submit" variant="secondary">
                  Cancel
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>

        {/* buttons */}
        <Card>
          <Card.Header>Buttons</Card.Header>
          <Card.Body className="tw:flex tw:flex-col tw:gap-4">
            <div className="tw:flex tw:flex-wrap tw:gap-2">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="info">Info</Button>
              <Button variant="light">Light</Button>
              <Button variant="dark">Dark</Button>
            </div>
            <div className="tw:flex tw:flex-wrap tw:gap-2">
              <Button variant="outline-primary">Primary</Button>
              <Button variant="outline-secondary">Secondary</Button>
              <Button variant="outline-success">Success</Button>
              <Button variant="outline-danger">Danger</Button>
              <Button variant="outline-warning">Warning</Button>
              <Button variant="outline-info">Info</Button>
              <Button variant="outline-light">Light</Button>
              <Button variant="outline-dark">Dark</Button>
            </div>
          </Card.Body>
        </Card>

        {/* tables */}
        <Card>
          <Card.Header>Tables</Card.Header>
          <Card.Body>
            <table className="pm-table table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">First</th>
                  <th scope="col">Last</th>
                  <th scope="col">Handle</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">1</th>
                  <td>Mark</td>
                  <td>Otto</td>
                  <td>@mdo</td>
                </tr>
                <tr>
                  <th scope="row">2</th>
                  <td>Jacob</td>
                  <td>Thornton</td>
                  <td>@fat</td>
                </tr>
                <tr>
                  <th scope="row">3</th>
                  <td>John</td>
                  <td>Doe</td>
                  <td>@social</td>
                </tr>
              </tbody>
            </table>
          </Card.Body>
        </Card>
      </section>

      {/* tailwind styling */}
      <section className="tw:mb-8 tw:flex tw:flex-col tw:gap-8">
        <h2>Sample Tailwind Styling</h2>

        <Card>
          <Card.Header>Fonts</Card.Header>
          <Card.Body>
            <h4>Font Sans</h4>
            <p className="tw:font-sans">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis ad explicabo quidem, totam rem perferendis
              illum aperiam! Beatae dolorum, ducimus repellendus quia odit, eius ipsum delectus blanditiis laboriosam,
              sed est.
            </p>

            <h4>Font Serif</h4>
            <p className="tw:font-serif">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis ad explicabo quidem, totam rem perferendis
              illum aperiam! Beatae dolorum, ducimus repellendus quia odit, eius ipsum delectus blanditiis laboriosam,
              sed est.
            </p>

            <h4>Font Mono</h4>
            <p className="tw:font-mono">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Omnis ad explicabo quidem, totam rem perferendis
              illum aperiam! Beatae dolorum, ducimus repellendus quia odit, eius ipsum delectus blanditiis laboriosam,
              sed est.
            </p>
          </Card.Body>
        </Card>
      </section>
    </div>
  );
};

export { SampleHome };
